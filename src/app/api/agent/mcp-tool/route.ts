import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { McpClientManager } from "@/lib/mcp/client";

const mcpToolSchema = z.object({
  meetingId: z.uuid(),
  botSecret: z.string().min(1, "Bot secret is required"),
  toolName: z.string().min(1, "Tool name is required"),
  arguments: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = mcpToolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { meetingId, botSecret, toolName, arguments: args } = parsed.data;

  const [meeting] = await db
    .select({ userId: meetings.userId, metadata: meetings.metadata })
    .from(meetings)
    .where(eq(meetings.id, meetingId));

  if (!meeting) {
    return NextResponse.json({ result: "Meeting not found." });
  }

  const storedSecret = (meeting.metadata as Record<string, unknown>)
    ?.voiceSecret;
  if (!storedSecret || storedSecret !== botSecret) {
    return NextResponse.json({ error: "Invalid bot secret" }, { status: 403 });
  }

  try {
    const manager = await McpClientManager.connectForUser(meeting.userId!);
    const result = await manager.callTool(toolName, args);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("[MCP Tool] Call failed:", error);
    return NextResponse.json({
      result: `Tool "${toolName}" is unavailable.`,
    });
  }
}
