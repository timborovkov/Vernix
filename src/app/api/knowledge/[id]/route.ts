import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { documents, meetings } from "@/lib/db/schema";
import { deleteFile, getDownloadUrl } from "@/lib/storage/operations";
import {
  deleteDocumentChunks,
  knowledgeCollectionName,
} from "@/lib/vector/knowledge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, user.id)));

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const downloadUrl = await getDownloadUrl(doc.s3Key);

  return NextResponse.json({ ...doc, downloadUrl });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, user.id)));

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Delete chunks from the correct Qdrant collection
  try {
    let collectionName: string | null = null;
    if (doc.meetingId) {
      const [meeting] = await db
        .select({ qdrantCollectionName: meetings.qdrantCollectionName })
        .from(meetings)
        .where(
          and(eq(meetings.id, doc.meetingId), eq(meetings.userId, user.id))
        );
      // If meeting is gone, its collection was already deleted — skip cleanup
      collectionName = meeting?.qdrantCollectionName ?? null;
    } else {
      collectionName = knowledgeCollectionName(user.id);
    }
    if (collectionName) {
      await deleteDocumentChunks(collectionName, id);
    }
  } catch {
    // Collection may not exist if processing failed
  }

  // Delete file from S3
  try {
    await deleteFile(doc.s3Key);
  } catch {
    // File may not exist if upload failed partially
  }

  // Delete DB row
  await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, user.id)));

  return NextResponse.json({ success: true });
}
