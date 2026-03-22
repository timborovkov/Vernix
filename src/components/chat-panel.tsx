"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatMessage } from "@/components/chat-message";
import { SendHorizontal, MessageSquare } from "lucide-react";

interface ChatPanelProps {
  meetingId?: string;
  placeholder?: string;
}

export function ChatPanel({
  meetingId,
  placeholder = "Ask a question...",
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent/chat",
        body: { meetingId },
      }),
    [meetingId]
  );

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll after DOM updates
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    if (error) clearError();
    sendMessage({ text: inputValue });
    setInputValue("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-4 w-4" />
          Chat with AI
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          className="mb-3 max-h-96 min-h-48 space-y-3 overflow-y-auto"
        >
          {messages.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm italic">
              {meetingId
                ? "Ask questions about this meeting"
                : "Ask questions about any of your meetings"}
            </p>
          )}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {error && (
            <div className="text-destructive flex items-center justify-center gap-2 text-sm">
              <span>{error.message}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="h-auto px-2 py-0.5 text-xs"
              >
                Dismiss
              </Button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            aria-label="Chat message"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !inputValue.trim()}
            aria-label="Send message"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
