import { z } from "zod/v4";
import { withApiAuth } from "@/lib/api/middleware";
import { apiSuccess, apiError, handleServiceError } from "@/lib/api/response";
import { getTask, updateTask } from "@/lib/services/tasks";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  assignee: z.string().max(200).nullable().optional(),
  status: z.enum(["open", "completed"]).optional(),
  dueDate: z.string().nullable().optional(),
});

export const GET = withApiAuth(
  async (_request, user, { params }) => {
    const { id } = await params;
    try {
      const task = await getTask(user.id, id);
      return apiSuccess(task);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "tasks:get" }
);

export const PATCH = withApiAuth(
  async (request, user, { params }) => {
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid JSON body", 400);
    }

    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Validation failed",
        400,
        parsed.error.issues
      );
    }

    try {
      const updated = await updateTask(user.id, id, parsed.data);
      return apiSuccess(updated);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "tasks:update" }
);
