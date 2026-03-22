import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { documents, meetings } from "@/lib/db/schema";
import { ensureBucket, uploadFile } from "@/lib/storage/operations";
import { processDocument } from "@/lib/knowledge/process";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILENAME_LENGTH = 255;

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
  "text/markdown": "md",
};

/** Strip path separators, control characters, and traversal patterns from user-supplied filename. */
function sanitizeFileName(name: string): string {
  return name.replace(/[/\\:\x00-\x1f]/g, "_").replace(/\.\./g, "_");
}

export async function GET(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get("meetingId");

  const conditions = [eq(documents.userId, user.id)];
  if (meetingId) {
    conditions.push(eq(documents.meetingId, meetingId));
  }

  const docs = await db
    .select()
    .from(documents)
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt));

  return NextResponse.json({ documents: docs });
}

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      },
      { status: 400 }
    );
  }

  const fileType = ALLOWED_TYPES[file.type];
  if (!fileType) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${file.type}. Allowed: PDF, DOCX, TXT, MD`,
      },
      { status: 400 }
    );
  }

  const safeName = sanitizeFileName(file.name);
  if (safeName.length === 0 || safeName.length > MAX_FILENAME_LENGTH) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  // Optional meeting scoping
  const meetingIdStr = formData.get("meetingId");
  const meetingId =
    typeof meetingIdStr === "string" && meetingIdStr ? meetingIdStr : null;

  if (meetingId) {
    const [meeting] = await db
      .select({ id: meetings.id })
      .from(meetings)
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)));
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
  }

  const documentId = randomUUID();
  const s3Key = `knowledge/${user.id}/${documentId}/${safeName}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    await ensureBucket();
    await uploadFile(s3Key, buffer, file.type);

    const [doc] = await db
      .insert(documents)
      .values({
        id: documentId,
        userId: user.id,
        meetingId,
        fileName: safeName,
        fileType,
        fileSize: file.size,
        s3Key,
        status: "processing",
      })
      .returning();

    // Process synchronously — files ≤10MB complete in seconds
    try {
      await processDocument(documentId, user.id, meetingId ?? undefined);
    } catch {
      // processDocument already sets status=failed in DB
    }

    // Re-fetch to get updated status
    const [updated] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    return NextResponse.json(updated ?? doc, { status: 201 });
  } catch (error) {
    console.error("Knowledge upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
