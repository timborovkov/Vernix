import { withApiAuth } from "@/lib/api/middleware";
import { apiSuccess, handleServiceError } from "@/lib/api/response";
import { listConnectedIntegrations } from "@/lib/services/integrations";

export const GET = withApiAuth(
  async (_request, user) => {
    try {
      const integrations = await listConnectedIntegrations(user.id);
      return apiSuccess(integrations);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "integrations:list" }
);
