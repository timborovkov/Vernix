"use client";

import type { UIMessage } from "ai";
import { isToolUIPart, getToolName } from "ai";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatTime, renderMarkdown } from "@/lib/format";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Clock,
  FileText,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface Source {
  text: string;
  score: number;
  source: "transcript" | "document";
  speaker?: string;
  timestampMs?: number;
  fileName?: string;
}

/** Extract human-readable name from a tool name. */
function toolDisplayName(toolName: string): string {
  if (toolName === "searchMeetingContext") return "Search call context";
  // MCP format: mcp__{serverId}__{originalToolName}
  const parts = toolName.split("__");
  if (parts.length >= 3 && parts[0] === "mcp") {
    return parts.slice(2).join("__").replace(/_/g, " ");
  }
  return toolName.replace(/_/g, " ");
}

function SourcesList({ sources }: { sources: Source[] }) {
  const [expanded, setExpanded] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        aria-label={expanded ? "Hide sources" : "Show sources"}
        className="text-muted-foreground h-auto px-1 py-0.5 text-xs"
      >
        {sources.length} source{sources.length !== 1 ? "s" : ""}
        {expanded ? (
          <ChevronUp className="ml-1 h-3 w-3" />
        ) : (
          <ChevronDown className="ml-1 h-3 w-3" />
        )}
      </Button>
      {expanded && (
        <div className="mt-1 space-y-1">
          {sources.map((source, i) => (
            <div key={i} className="bg-muted/50 rounded px-2 py-1.5 text-xs">
              <div className="text-muted-foreground flex items-center gap-2">
                {source.source === "document" ? (
                  <span className="flex items-center gap-0.5 font-medium">
                    <FileText className="h-2.5 w-2.5" />
                    {source.fileName}
                  </span>
                ) : (
                  <>
                    <span className="font-medium">{source.speaker}</span>
                    {source.timestampMs != null && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTime(source.timestampMs)}
                      </span>
                    )}
                  </>
                )}
                <span className="ml-auto opacity-60">
                  {(source.score * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mt-0.5 leading-snug">{source.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function McpToolResult({
  toolName,
  result,
}: {
  toolName: string;
  result: unknown;
}) {
  const [expanded, setExpanded] = useState(false);
  const display = toolDisplayName(toolName);

  return (
    <div className="mt-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="text-muted-foreground h-auto px-1 py-0.5 text-xs"
      >
        <CheckCircle2 className="mr-1 h-3 w-3 text-green-500" />
        {display}
        {expanded ? (
          <ChevronUp className="ml-1 h-3 w-3" />
        ) : (
          <ChevronDown className="ml-1 h-3 w-3" />
        )}
      </Button>
      {expanded && result != null && (
        <pre className="bg-muted/50 mt-1 max-h-40 overflow-auto rounded px-2 py-1.5 text-xs leading-relaxed break-all whitespace-pre-wrap">
          {typeof result === "string"
            ? result
            : JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ActiveToolIndicator({ toolName }: { toolName: string }) {
  const display = toolDisplayName(toolName);
  const isSearch = toolName === "searchMeetingContext";

  return (
    <div className="text-muted-foreground flex items-center gap-2 py-1 text-xs">
      {isSearch ? (
        <Search className="h-3 w-3 animate-pulse" />
      ) : (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      {isSearch ? "Searching call context..." : `Using ${display}...`}
    </div>
  );
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  let textContent = "";
  const sources: Source[] = [];
  const activeTools: { toolCallId: string; toolName: string }[] = [];
  const completedMcpTools: {
    toolCallId: string;
    toolName: string;
    result: unknown;
  }[] = [];

  for (const part of message.parts) {
    if (part.type === "text") {
      textContent += part.text;
      continue;
    }

    // isToolUIPart handles both static tools (type: "tool-{name}") and
    // dynamic/MCP tools (type: "dynamic-tool") from AI SDK v6
    if (!isToolUIPart(part)) continue;

    const toolName = getToolName(part);
    // Both static and dynamic parts have toolCallId, state, output directly (flat)
    const { toolCallId, state } = part as unknown as {
      toolCallId: string;
      state: string;
      output?: unknown;
    };
    const output = (part as unknown as { output?: unknown }).output;

    if (state === "input-streaming" || state === "input-available") {
      activeTools.push({ toolCallId, toolName });
    }

    if (state === "output-available") {
      if (toolName === "searchMeetingContext") {
        if (
          output &&
          typeof output === "object" &&
          "sources" in output &&
          Array.isArray((output as { sources: unknown }).sources)
        ) {
          sources.push(...(output as { sources: Source[] }).sources);
        }
      } else {
        completedMcpTools.push({ toolCallId, toolName, result: output });
      }
    }
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {activeTools.map(({ toolCallId, toolName }) => (
          <ActiveToolIndicator key={toolCallId} toolName={toolName} />
        ))}

        {completedMcpTools.map(({ toolCallId, toolName, result }) => (
          <McpToolResult key={toolCallId} toolName={toolName} result={result} />
        ))}

        {textContent && (
          <div
            className="text-sm [&_li]:mt-0.5 [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(textContent),
            }}
          />
        )}

        <SourcesList sources={sources} />
      </div>
    </div>
  );
}
