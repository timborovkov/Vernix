import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { listDocuments, uploadDocument } from "@/lib/services/knowledge";
import { BillingError, NotFoundError, ValidationError } from "@/lib/api/errors";

export async function GET(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get("meetingId") ?? undefined;

  try {
    const result = await listDocuments(user.id, { meetingId, limit: 1000 });
    return NextResponse.json({ documents: result.data });
  } catch (error) {
    console.error("Knowledge list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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

  const meetingIdStr = formData.get("meetingId");
  const meetingId =
    typeof meetingIdStr === "string" && meetingIdStr ? meetingIdStr : undefined;

  try {
    const doc = await uploadDocument(user.id, file, meetingId);
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof BillingError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Knowledge upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
