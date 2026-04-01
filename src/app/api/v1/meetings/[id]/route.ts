import { z } from "zod/v4";
import { withApiAuth } from "@/lib/api/middleware";
import { apiSuccess, apiError, handleServiceError } from "@/lib/api/response";
import {
  getMeeting,
  updateMeeting,
  deleteMeeting,
} from "@/lib/services/meetings";

const updateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  joinLink: z.url().optional(),
  agenda: z.string().max(10000).optional(),
  silent: z.boolean().optional(),
  muted: z.boolean().optional(),
  noRecording: z.boolean().optional(),
});

export const GET = withApiAuth(
  async (_request, user, { params }) => {
    const { id } = await params;
    try {
      const meeting = await getMeeting(user.id, id);
      return apiSuccess(meeting);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "meetings:get" }
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

    const parsed = updateMeetingSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Validation failed",
        400,
        parsed.error.issues
      );
    }

    try {
      const updated = await updateMeeting(user.id, id, parsed.data);
      return apiSuccess(updated);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "meetings:update" }
);

export const DELETE = withApiAuth(
  async (_request, user, { params }) => {
    const { id } = await params;
    try {
      await deleteMeeting(user.id, id);
      return apiSuccess({ deleted: true });
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "meetings:delete" }
);
