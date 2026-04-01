import { z } from "zod/v4";
import { withApiAuth } from "@/lib/api/middleware";
import { RATE_LIMIT_EXPENSIVE } from "@/lib/api/constants";
import { apiSuccess, apiError, handleServiceError } from "@/lib/api/response";
import { searchMeetings } from "@/lib/services/search";

const searchSchema = z.object({
  q: z.string().min(1, "Query is required"),
  meetingId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const GET = withApiAuth(
  async (request, user) => {
    const { searchParams } = new URL(request.url);

    const parsed = searchSchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      meetingId: searchParams.get("meetingId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid search params",
        400,
        parsed.error.issues
      );
    }

    try {
      const results = await searchMeetings(user.id, {
        query: parsed.data.q,
        meetingId: parsed.data.meetingId,
        limit: parsed.data.limit,
      });
      return apiSuccess(results);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "search", ratePerMinute: RATE_LIMIT_EXPENSIVE }
);
