import { withApiAuth } from "@/lib/api/middleware";
import { apiSuccess, handleServiceError } from "@/lib/api/response";
import { getTranscript } from "@/lib/services/transcripts";

export const GET = withApiAuth(
  async (_request, user, { params }) => {
    const { id } = await params;
    try {
      const result = await getTranscript(user.id, id);
      return apiSuccess(result);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "meetings:transcript" }
);
