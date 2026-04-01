import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { getDocument, deleteDocument } from "@/lib/services/knowledge";
import { NotFoundError } from "@/lib/api/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  try {
    const doc = await getDocument(user.id, id);
    return NextResponse.json(doc);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  try {
    await deleteDocument(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
