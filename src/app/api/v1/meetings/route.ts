import { z } from "zod/v4";
import { withApiAuth } from "@/lib/api/middleware";
import { RATE_LIMIT_EXPENSIVE } from "@/lib/api/constants";
import {
  apiSuccess,
  apiCreated,
  apiError,
  handleServiceError,
} from "@/lib/api/response";
import { paginationSchema } from "@/lib/api/pagination";
import { listMeetings, createMeeting, getMeeting } from "@/lib/services/meetings";
import { joinMeeting } from "@/lib/services/agent";

const createMeetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  joinLink: z.url("Must be a valid URL"),
  agenda: z.string().max(10000).optional(),
  silent: z.boolean().optional().default(false),
  noRecording: z.boolean().optional().default(false),
  autoJoin: z.boolean().optional().default(false),
});

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

    const rawStatus = searchParams.get("status") ?? undefined;
    const validStatuses = [
      "pending",
      "joining",
      "active",
      "processing",
      "completed",
      "failed",
    ] as const;
    const status =
      rawStatus &&
      validStatuses.includes(rawStatus as (typeof validStatuses)[number])
        ? rawStatus
        : undefined;

    try {
      const result = await listMeetings(user.id, {
        status,
        ...parsed.data,
      });
      return apiSuccess(result.data, result.meta);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "meetings:list" }
);

export const POST = withApiAuth(
  async (request, user) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid JSON body", 400);
    }

    const parsed = createMeetingSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Validation failed",
        400,
        parsed.error.issues
      );
    }

    const { autoJoin, ...meetingInput } = parsed.data;

    try {
      const meeting = await createMeeting(user.id, meetingInput);

      if (autoJoin) {
        try {
          const joinResult = await joinMeeting(user.id, meeting.id, user.name, {
            skipBillingCheck: true,
          });
          return apiCreated({
            ...meeting,
            agent: { botId: joinResult.botId, status: joinResult.status },
          });
        } catch (joinError) {
          // Meeting created but join failed — re-fetch to get current DB state
          let currentMeeting;
          try {
            currentMeeting = await getMeeting(user.id, meeting.id);
          } catch {
            currentMeeting = meeting;
          }
          return apiCreated({
            ...currentMeeting,
            agent: {
              status: "failed",
              error:
                joinError instanceof Error
                  ? joinError.message
                  : "Failed to join meeting",
            },
          });
        }
      }

      return apiCreated(meeting);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  { endpoint: "meetings:create", ratePerMinute: RATE_LIMIT_EXPENSIVE }
);
