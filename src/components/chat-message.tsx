"use client";

import type { UIMessage } from "ai";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatTime, renderMarkdown } from "@/lib/format";
import { ChevronDown, ChevronUp, Search, Clock, FileText } from "lucide-react";

interface Source {
  text: string;
  score: number;
  source: "transcript" | "document";
  speaker?: string;
  timestampMs?: number;
  fileName?: string;
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
    if (part.type.startsWith("tool-") && "state" in part) {
      const state = (part as { state: string }).state;
      if (state === "input-streaming" || state === "input-available") {
        hasActiveToolCall = true;
      }
      if (state === "output-available") {
        const output = (part as { output?: unknown }).output;
        if (
          output &&
          typeof output === "object" &&
          "sources" in output &&
          Array.isArray((output as { sources: unknown }).sources)
        ) {
          sources.push(...(output as { sources: Source[] }).sources);
        }
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
