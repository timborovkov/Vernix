import { withApiAuth } from "@/lib/api/middleware";
import { RATE_LIMIT_EXPENSIVE } from "@/lib/api/constants";
import { apiSuccess, apiCreated, apiError, handleServiceError } from "@/lib/api/response";
import { paginationSchema } from "@/lib/api/pagination";
import { listDocuments, uploadDocument } from "@/lib/services/knowledge";

export const GET = withApiAuth(
  async (request, user) => {
    const { searchParams } = new URL(request.url);

    const parsed = paginationSchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid pagination params", 400, parsed.error.issues);
    }

    const meetingId = searchParams.get("meetingId") ?? undefined;

    try {
      const result = await listDocuments(user.id, {
        meetingId,
        ...parsed.data,
      });
      return apiSuccess(result.data, result.meta);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "knowledge:list" }
);

export const POST = withApiAuth(
  async (request, user) => {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return apiError("VALIDATION_ERROR", "Expected multipart/form-data", 400);
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return apiError("VALIDATION_ERROR", "Missing file field", 400);
    }

    const meetingIdStr = formData.get("meetingId");
    const meetingId = typeof meetingIdStr === "string" && meetingIdStr ? meetingIdStr : undefined;

    try {
      const doc = await uploadDocument(user.id, file, meetingId);
      return apiCreated(doc);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "knowledge:upload", ratePerMinute: RATE_LIMIT_EXPENSIVE }
);
