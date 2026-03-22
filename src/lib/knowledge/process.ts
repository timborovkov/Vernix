import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, meetings } from "@/lib/db/schema";
import { getDownloadUrl } from "@/lib/storage/operations";
import { parseDocument, type FileType } from "./parse";
import { chunkText } from "./chunk";
import {
  ensureKnowledgeCollection,
  upsertDocumentChunks,
} from "@/lib/vector/knowledge";

const MAX_CHUNKS = 500;

export async function processDocument(
  documentId: string,
  userId: string,
  meetingId?: string
): Promise<void> {
  try {
    // 1. Get document metadata (scoped to user for safety)
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));

    if (!doc) throw new Error(`Document not found: ${documentId}`);

    // 2. Download file from S3
    const url = await getDownloadUrl(doc.s3Key);
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Failed to download file: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());

    // 3. Parse document
    const validTypes: FileType[] = ["pdf", "docx", "txt", "md"];
    if (!validTypes.includes(doc.fileType as FileType)) {
      throw new Error(`Invalid file type: ${doc.fileType}`);
    }
    const text = await parseDocument(buffer, doc.fileType as FileType);
    if (!text.trim()) {
      throw new Error("Document contains no extractable text");
    }

    // 4. Chunk text
    const chunks = chunkText(text);
    if (chunks.length > MAX_CHUNKS) {
      throw new Error(
        `Document produced ${chunks.length} chunks (max ${MAX_CHUNKS})`
      );
    }

    // 5. Determine target collection
    let collectionName: string;
    if (meetingId) {
      // Meeting-scoped: upsert into the meeting's existing collection
      const [meeting] = await db
        .select({ qdrantCollectionName: meetings.qdrantCollectionName })
        .from(meetings)
        .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));
      if (!meeting) throw new Error(`Meeting not found: ${meetingId}`);
      collectionName = meeting.qdrantCollectionName;
    } else {
      // Global: upsert into the user's knowledge collection
      collectionName = await ensureKnowledgeCollection(userId);
    }

    // 6. Batch embed + upsert
    await upsertDocumentChunks(
      collectionName,
      chunks.map((c) => ({
        text: c.text,
        documentId,
        fileName: doc.fileName,
        chunkIndex: c.index,
      }))
    );

    // 7. Update status
    await db
      .update(documents)
      .set({
        status: "ready",
        chunkCount: chunks.length,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown processing error";
    await db
      .update(documents)
      .set({ status: "failed", error: message, updatedAt: new Date() })
      .where(eq(documents.id, documentId));
    throw error;
  }
}
