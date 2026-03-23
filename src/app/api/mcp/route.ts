import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { randomUUID } from "crypto";
import { authenticateApiKey } from "@/lib/auth/api-key";
import { createMcpServer } from "@/lib/mcp/server";

// Store active transports by session ID for multi-request sessions
const transports = new Map<string, WebStandardStreamableHTTPServerTransport>();

async function handleMcpRequest(request: Request): Promise<Response> {
  const user = await authenticateApiKey(request);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check for existing session
  const sessionId = request.headers.get("mcp-session-id");

  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    return transport.handleRequest(request);
  }

  // New session — create transport and server
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      transports.set(id, transport);
    },
  });

  // Clean up on close
  transport.onclose = () => {
    if (transport.sessionId) {
      transports.delete(transport.sessionId); // eslint-disable-line drizzle/enforce-delete-with-where -- Map.delete
    }
  };

  const server = createMcpServer(user.id);
  await server.connect(transport);

  return transport.handleRequest(request);
}

export async function GET(request: Request) {
  return handleMcpRequest(request);
}

export async function POST(request: Request) {
  return handleMcpRequest(request);
}

export async function DELETE(request: Request) {
  return handleMcpRequest(request);
}
