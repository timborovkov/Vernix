import type {
  Meeting,
  Document,
  Task,
  ApiKey,
  McpServer,
} from "@/lib/db/schema";

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
    userId: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
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

export function fakeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "c2aadd11-2b3c-4ef8-bb6d-8dd1df602c33",
    userId: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
    meetingId: null,
    fileName: "test-doc.pdf",
    fileType: "pdf",
    fileSize: 1024,
    s3Key:
      "knowledge/b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22/c2aadd11-2b3c-4ef8-bb6d-8dd1df602c33/test-doc.pdf",
    status: "ready",
    chunkCount: 5,
    error: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function fakeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "d3bbee22-3c4d-4ef8-bb6d-9ee2ef713d44",
    meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    userId: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
    title: "Follow up with client",
    assignee: "Alice",
    autoExtracted: false,
    dueDate: null,
    status: "open",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function fakeApiKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: "e4ccff33-4d5e-4ef8-bb6d-aff3fg824e55",
    userId: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
    name: "Test Key",
    keyHash: "$2a$10$fakehash",
    keyPrefix: "kk_test",
    lastUsedAt: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function fakeMcpServer(overrides: Partial<McpServer> = {}): McpServer {
  return {
    id: "f5ddgg44-5e6f-4ef8-bb6d-bgg4gh935f66",
    userId: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
    name: "Test MCP Server",
    url: "https://mcp.example.com/sse",
    apiKey: null,
    authType: "none",
    authHeaderName: null,
    authHeaderValue: null,
    authKeyParam: null,
    authUsername: null,
    authPassword: null,
    catalogIntegrationId: null,
    enabled: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}
