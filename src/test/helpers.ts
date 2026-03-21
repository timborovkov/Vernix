import type { Meeting } from "@/lib/db/schema";

export function createJsonRequest(
  url: string,
  options?: { method?: string; body?: unknown }
) {
  return new Request(url, {
    method: options?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
}

export async function parseJsonResponse(response: Response) {
  return {
    status: response.status,
    data: await response.json(),
  };
}

export function fakeMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    title: "Test Meeting",
    joinLink: "https://meet.google.com/abc-defg-hij",
    status: "pending",
    qdrantCollectionName: "meeting_test123",
    participants: [],
    metadata: {},
    startedAt: null,
    endedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}
