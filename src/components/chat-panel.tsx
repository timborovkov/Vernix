"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatMessage } from "@/components/chat-message";
import { SendHorizontal, MessageSquare, Gauge } from "lucide-react";
import Link from "next/link";
import { PRICING, PLANS } from "@/lib/billing/constants";

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
  const isBillingLimitError =
    error?.message?.includes("RAG query limit") ||
    error?.message?.includes("RATE_LIMITED") ||
    error?.message?.includes("limit reached");

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
          {error &&
            (isBillingLimitError ? (
              <div className="bg-muted/50 flex flex-col items-center gap-2 rounded-lg p-4 text-center">
                <Gauge className="text-muted-foreground h-5 w-5" />
                <p className="text-sm font-medium">Daily query limit reached</p>
                <p className="text-muted-foreground text-xs">
                  Upgrade to Pro for {PLANS.PRO === "pro" ? "200" : "more"}{" "}
                  queries per day.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => {
                      const productId =
                        process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID_PRO_MONTHLY;
                      window.location.href = productId
                        ? `/api/checkout?products=${productId}`
                        : "/pricing";
                    }}
                  >
                    Upgrade — €{PRICING[PLANS.PRO].monthly}/mo
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    render={<Link href="/pricing" />}
                  >
                    View plans
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="text-muted-foreground h-auto px-2 py-0.5 text-xs"
                >
                  Dismiss
                </Button>
              </div>
            ) : (
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
            ))}
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
