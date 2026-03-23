import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { randomUUID } from "crypto";
import { authenticateApiKey } from "@/lib/auth/api-key";
import { createMcpServer } from "@/lib/mcp/server";

// Store active transports with their owning userId and last activity time
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes
const transports = new Map<
  string,
  {
    transport: WebStandardStreamableHTTPServerTransport;
    userId: string;
    lastActivity: number;
  }
>();

// Evict abandoned sessions periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of transports) {
      if (now - entry.lastActivity > SESSION_TTL) {
        try {
          entry.transport.close?.();
        } catch {
          // Best effort
        }
        // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
        transports.delete(id);
      }
    }
  }, 60_000);
}

async function handleMcpRequest(request: Request): Promise<Response> {
  const user = await authenticateApiKey(request);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check for existing session — verify userId matches to prevent cross-user access
  const sessionId = request.headers.get("mcp-session-id");
  if (sessionId) {
    const entry = transports.get(sessionId);
    if (entry && entry.userId === user.id) {
      entry.lastActivity = Date.now();
      return entry.transport.handleRequest(request);
    }
    // MCP spec requires 404 for unrecognized/unauthorized session IDs
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // New session — create transport and server
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      transports.set(id, {
        transport,
        userId: user.id,
        lastActivity: Date.now(),
      });
    },
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
      transports.delete(transport.sessionId);
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
