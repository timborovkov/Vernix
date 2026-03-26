import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getOpenAIClient } from "@/lib/openai/client";
import { getRAGContext, formatContextForPrompt } from "@/lib/agent/rag";
import { getSilentAgentSystemPrompt } from "@/lib/agent/prompts";
import { McpClientManager } from "@/lib/mcp/client";

const MAX_RESPONSE_LENGTH = 500;

export interface AgentResponse {
  text: string;
  leave?: boolean;
  mute?: boolean;
}

export async function generateAgentResponse(
  meetingId: string,
  userId: string,
  recentTranscript: string,
  agenda?: string | null
): Promise<AgentResponse> {
  let ragContext = "";
  try {
    const results = await getRAGContext(recentTranscript, {
      userId,
      boostMeetingId: meetingId,
    });
    ragContext = formatContextForPrompt(results);
  } catch (err) {
    console.warn(
      "[AgentResponse] RAG search failed, proceeding without context:",
      err
    );
  }

  // Load MCP tools for the meeting owner
  let mcpTools: Array<{
    type: "function";
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }> = [];
  let mcpManager: McpClientManager | null = null;
  try {
    mcpManager = await McpClientManager.connectForUser(userId);
    mcpTools = mcpManager.getOpenAITools();
  } catch (err) {
    console.warn(
      "[AgentResponse] MCP connection failed, proceeding without:",
      err
    );
  }

  const mcpToolDescriptions = mcpTools.map((t) => ({
    name: t.name,
    description: t.description,
  }));

  const systemPrompt = getSilentAgentSystemPrompt(agenda, mcpToolDescriptions);

  const userMessage = ragContext
    ? `Recent meeting transcript:\n${recentTranscript}\n\nRelevant context:\n${ragContext}`
    : `Recent meeting transcript:\n${recentTranscript}`;

  const openai = getOpenAIClient();

  const builtInToolDefs = [
    {
      type: "function" as const,
      function: {
        name: "leave_meeting",
        description:
          "Leave the current meeting. Use when a participant explicitly asks you to leave or disconnect.",
        parameters: { type: "object" as const, properties: {}, required: [] },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "mute_self",
        description:
          "Mute yourself for the rest of the meeting. Use when a participant asks you to be quiet, stop listening, or mute. You will not respond until the host unmutes you.",
        parameters: { type: "object" as const, properties: {}, required: [] },
      },
    },
  ];

  const mcpToolDefs = mcpTools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  const tools = [...builtInToolDefs, ...mcpToolDefs];

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  // One round of tool calls allowed
  const completion = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    messages,
    max_tokens: 200,
    temperature: 0.7,
    tools,
    tool_choice: "auto",
  });

  let shouldLeave = false;
  let shouldMute = false;

  const firstChoice = completion.choices[0];
  if (
    firstChoice?.finish_reason === "tool_calls" &&
    firstChoice.message.tool_calls
  ) {
    messages.push(firstChoice.message);

    for (const call of firstChoice.message.tool_calls) {
      if (call.type !== "function") continue;

      if (call.function.name === "leave_meeting") {
        shouldLeave = true;
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ leaving: true }),
        });
        continue;
      }

      if (call.function.name === "mute_self") {
        shouldMute = true;
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ muted: true }),
        });
        continue;
      }

      let toolResult = "";
      if (mcpManager) {
        try {
          const args = JSON.parse(call.function.arguments) as Record<
            string,
            unknown
          >;
          const result = await mcpManager.callTool(call.function.name, args);
          toolResult = JSON.stringify(result);
        } catch (err) {
          toolResult = `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
        }
      } else {
        toolResult = "Tool not available";
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: toolResult,
      });
    }

    const followUp = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages,
      max_tokens: 200,
      temperature: 0.7,
    });
    const response = followUp.choices[0]?.message?.content ?? "";
    return {
      text: response.slice(0, MAX_RESPONSE_LENGTH),
      leave: shouldLeave,
      mute: shouldMute,
    };
  }

  const response = firstChoice?.message?.content ?? "";
  return {
    text: response.slice(0, MAX_RESPONSE_LENGTH),
    leave: shouldLeave,
    mute: shouldMute,
  };
}
