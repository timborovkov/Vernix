import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { documents, meetings } from "@/lib/db/schema";
import { and, desc, eq, getTableColumns, lt, or } from "drizzle-orm";
import {
  ensureBucket,
  uploadFile,
  deleteFile,
  getDownloadUrl,
} from "@/lib/storage/operations";
import { processDocument } from "@/lib/knowledge/process";
import {
  deleteDocumentChunks,
  knowledgeCollectionName,
} from "@/lib/vector/knowledge";
import { requireLimits } from "@/lib/billing/enforce";
import { canUploadDocument } from "@/lib/billing/limits";
import {
  getDocumentCount,
  getMonthlyDocUploads,
  getTotalStorageMB,
  recordUsageEvent,
} from "@/lib/billing/usage";
import { NotFoundError, BillingError, ValidationError } from "@/lib/api/errors";
import { decodeCursor, buildPaginationMeta } from "@/lib/api/pagination";

const MAX_FILENAME_LENGTH = 255;

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
  "text/markdown": "md",
};

function sanitizeFileName(name: string): string {
  return name.replace(/[/\\:\x00-\x1f]/g, "_").replace(/\.\./g, "_");
}

// ---------------------------------------------------------------------------
// List documents (paginated)
// ---------------------------------------------------------------------------

export async function listDocuments(
  userId: string,
  opts: { meetingId?: string; cursor?: string; limit?: number }
) {
  const limit = opts.limit ?? 20;
  const conditions = [eq(documents.userId, userId)];

  if (opts.meetingId) conditions.push(eq(documents.meetingId, opts.meetingId));

  if (opts.cursor) {
    const cursor = decodeCursor(opts.cursor);
    if (cursor) {
      conditions.push(
        or(
          lt(documents.createdAt, new Date(cursor.createdAt)),
          and(
            eq(documents.createdAt, new Date(cursor.createdAt)),
            lt(documents.id, cursor.id)
          )
        )!
      );
    }
  }

  const rows = await db
    .select({
      ...getTableColumns(documents),
      meetingTitle: meetings.title,
    })
    .from(documents)
    .leftJoin(meetings, eq(documents.meetingId, meetings.id))
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt), desc(documents.id))
    .limit(limit + 1);

  return buildPaginationMeta(rows, limit);
}

// ---------------------------------------------------------------------------
// Get document
// ---------------------------------------------------------------------------

export async function getDocument(userId: string, documentId: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));

  if (!doc) throw new NotFoundError("Document");

  const downloadUrl = await getDownloadUrl(doc.s3Key);
  return { ...doc, downloadUrl };
}

// ---------------------------------------------------------------------------
// Upload document
// ---------------------------------------------------------------------------

export async function uploadDocument(
  userId: string,
  file: File,
  meetingId?: string
) {
  if (file.size === 0) throw new ValidationError("File is empty");

  const fileType = ALLOWED_TYPES[file.type];
  if (!fileType) {
    throw new ValidationError(
      `Unsupported file type: ${file.type}. Allowed: PDF, DOCX, TXT, MD`
    );
  }

  const safeName = sanitizeFileName(file.name);
  if (safeName.length === 0 || safeName.length > MAX_FILENAME_LENGTH) {
    throw new ValidationError("Invalid filename");
  }

  // Billing check
  const { limits } = await requireLimits(userId);
  const fileSizeMB = file.size / (1024 * 1024);
  const [docCount, monthlyUploads, totalStorageMB] = await Promise.all([
    getDocumentCount(userId),
    getMonthlyDocUploads(userId),
    getTotalStorageMB(userId),
  ]);
  const uploadCheck = canUploadDocument(
    limits,
    docCount,
    monthlyUploads,
    totalStorageMB,
    fileSizeMB
  );
  if (!uploadCheck.allowed) throw new BillingError(uploadCheck.reason!);

  // Verify meeting ownership if scoped
  if (meetingId) {
    const [meeting] = await db
      .select({ id: meetings.id })
      .from(meetings)
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));
    if (!meeting) throw new NotFoundError("Meeting");
  }

  const documentId = randomUUID();
  const s3Key = `knowledge/${userId}/${documentId}/${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await ensureBucket();
  await uploadFile(s3Key, buffer, file.type);

  const [doc] = await db
    .insert(documents)
    .values({
      id: documentId,
      userId,
      meetingId: meetingId ?? null,
      fileName: safeName,
      fileType,
      fileSize: file.size,
      s3Key,
      status: "processing",
    })
    .returning();

  recordUsageEvent(userId, "doc_upload").catch((e) =>
    console.error("[Billing] Usage recording failed:", e)
  );

  // Process synchronously for small files
  try {
    await processDocument(documentId, userId, meetingId);
  } catch {
    // processDocument sets status=failed in DB
  }

  // Re-fetch for updated status
  const [updated] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));

  return updated ?? doc!;
}

// ---------------------------------------------------------------------------
// Delete document
// ---------------------------------------------------------------------------

export async function deleteDocument(userId: string, documentId: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));

  if (!doc) throw new NotFoundError("Document");

  // Delete chunks from Qdrant
  try {
    let collectionName: string | null = null;
    if (doc.meetingId) {
      const [meeting] = await db
        .select({ qdrantCollectionName: meetings.qdrantCollectionName })
        .from(meetings)
        .where(
          and(eq(meetings.id, doc.meetingId), eq(meetings.userId, userId))
        );
      collectionName = meeting?.qdrantCollectionName ?? null;
    } else {
      collectionName = knowledgeCollectionName(userId);
    }
    if (collectionName) await deleteDocumentChunks(collectionName, documentId);
  } catch {
    // Collection may not exist
  }

  try {
    await deleteFile(doc.s3Key);
  } catch {
    // best-effort
  }

  await db
    .delete(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
}
