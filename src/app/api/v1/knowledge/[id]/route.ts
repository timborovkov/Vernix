import { withApiAuth } from "@/lib/api/middleware";
import { apiSuccess, handleServiceError } from "@/lib/api/response";
import { getDocument, deleteDocument } from "@/lib/services/knowledge";

export const GET = withApiAuth(
  async (_request, user, { params }) => {
    const { id } = await params;
    try {
      const doc = await getDocument(user.id, id);
      return apiSuccess(doc);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "knowledge:get" }
);

export const DELETE = withApiAuth(
  async (_request, user, { params }) => {
    const { id } = await params;
    try {
      await deleteDocument(user.id, id);
      return apiSuccess({ deleted: true });
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "knowledge:delete" }
);
