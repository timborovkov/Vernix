import { withApiAuth } from "@/lib/api/middleware";
import { apiSuccess, apiError, handleServiceError } from "@/lib/api/response";
import { paginationSchema } from "@/lib/api/pagination";
import { listTasks } from "@/lib/services/tasks";

export const GET = withApiAuth(
  async (request, user) => {
    const { searchParams } = new URL(request.url);

    const parsed = paginationSchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid pagination params",
        400,
        parsed.error.issues
      );
    }

    const status = searchParams.get("status") as
      | "open"
      | "completed"
      | undefined;

    try {
      const result = await listTasks(user.id, {
        status:
          status === "open" || status === "completed" ? status : undefined,
        ...parsed.data,
      });
      return apiSuccess(result.data, result.meta);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "tasks:list" }
);
