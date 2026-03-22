"use client";

import type { UIMessage } from "ai";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Search, Clock } from "lucide-react";

interface Source {
  text: string;
  speaker: string;
  timestampMs: number;
  score: number;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function renderMarkdown(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  const blocks = escaped.split(/\n{2,}/);

  return blocks
    .map((block) => {
      const lines = block.trim().split("\n");
      if (lines.every((l) => l.startsWith("- "))) {
        const items = lines.map((l) => `<li>${l.slice(2)}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${lines.join("<br>")}</p>`;
    })
    .join("");
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
                <span className="font-medium">{source.speaker}</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {formatTime(source.timestampMs)}
                </span>
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

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  // Extract text and tool states from parts
  let textContent = "";
  const sources: Source[] = [];
  let hasActiveToolCall = false;

  for (const part of message.parts) {
    if (part.type === "text") {
      textContent += part.text;
    }
    // Tool parts have type "tool-{name}" in v6
    if (part.type.startsWith("tool-")) {
      const toolPart = part as {
        state: string;
        output?: { sources?: Source[] };
      };
      if (
        toolPart.state === "input-streaming" ||
        toolPart.state === "input-available"
      ) {
        hasActiveToolCall = true;
      }
      if (toolPart.state === "output-available" && toolPart.output?.sources) {
        sources.push(...toolPart.output.sources);
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
        {hasActiveToolCall && (
          <div className="text-muted-foreground flex items-center gap-2 py-1 text-xs">
            <Search className="h-3 w-3 animate-pulse" />
            Searching meeting context...
          </div>
        )}

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
