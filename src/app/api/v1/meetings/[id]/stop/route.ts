import { withApiAuth } from "@/lib/api/middleware";
import { RATE_LIMIT_EXPENSIVE } from "@/lib/api/constants";
import { apiSuccess, handleServiceError } from "@/lib/api/response";
import { stopMeeting } from "@/lib/services/agent";

export const POST = withApiAuth(
  async (_request, user, { params }) => {
    const { id } = await params;
    try {
      const result = await stopMeeting(user.id, id);
      return apiSuccess(result);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "meetings:stop", ratePerMinute: RATE_LIMIT_EXPENSIVE }
);
