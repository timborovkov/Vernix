import { z } from "zod/v4";
import { withApiAuth } from "@/lib/api/middleware";
import {
  apiSuccess,
  apiCreated,
  apiError,
  handleServiceError,
} from "@/lib/api/response";
import { paginationSchema } from "@/lib/api/pagination";
import { listTasks, createTask } from "@/lib/services/tasks";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  assignee: z.string().max(200).optional(),
});

export const GET = withApiAuth(
  async (request, user, { params }) => {
    const { id } = await params;
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
        meetingId: id,
        status:
          status === "open" || status === "completed" ? status : undefined,
        ...parsed.data,
      });
      return apiSuccess(result.data, result.meta);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "meetings:tasks:list" }
);

export const POST = withApiAuth(
  async (request, user, { params }) => {
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid JSON body", 400);
    }

    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Validation failed",
        400,
        parsed.error.issues
      );
    }

    try {
      const task = await createTask(user.id, id, parsed.data);
      return apiCreated(task);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "meetings:tasks:create" }
);
