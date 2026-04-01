import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import {
  getMeeting,
  updateMeeting,
  deleteMeeting,
} from "@/lib/services/meetings";
import { NotFoundError, ValidationError } from "@/lib/api/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  try {
    const meeting = await getMeeting(user.id, id);
    return NextResponse.json(meeting);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const body = await request.json();

  const { title, joinLink, agenda, silent, muted, noRecording } =
    body as Record<string, unknown>;

  try {
    const updated = await updateMeeting(user.id, id, {
      title: typeof title === "string" ? title : undefined,
      joinLink: typeof joinLink === "string" ? joinLink : undefined,
      agenda: typeof agenda === "string" ? agenda : undefined,
      silent: typeof silent === "boolean" ? silent : undefined,
      muted: typeof muted === "boolean" ? muted : undefined,
      noRecording: typeof noRecording === "boolean" ? noRecording : undefined,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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
    await deleteMeeting(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
