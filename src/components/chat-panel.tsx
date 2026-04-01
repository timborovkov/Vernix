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
import { PRICING, PLANS, LIMITS } from "@/lib/billing/constants";
import { useBilling } from "@/hooks/use-billing";
import { getCheckoutUrl } from "@/lib/billing/checkout-url";

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
  const { billing } = useBilling();

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

  const ragUsed = billing?.usage.ragQueries ?? 0;
  const ragLimit =
    billing?.limits.ragQueriesPerDay ?? LIMITS[PLANS.FREE].ragQueriesPerDay;
  const ragPct = Math.min(100, (ragUsed / ragLimit) * 100);

  // Detect billing limit from usage data rather than fragile string matching
  const isBillingLimitError = error && ragUsed >= ragLimit;

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

  const checkoutUrl = getCheckoutUrl();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-4 w-4" />
            Chat with AI
          </CardTitle>
          {billing && (
            <span className="text-muted-foreground text-xs">
              {ragUsed}/{ragLimit} today
            </span>
          )}
        </div>
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
                ? "Ask questions about this call"
                : "Ask questions about any of your calls"}
            </p>
          )}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {error &&
            (isBillingLimitError ? (
              <div className="bg-muted/50 flex flex-col items-center gap-3 rounded-lg p-4 text-center">
                <Gauge className="text-muted-foreground h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Daily question limit reached
                  </p>
                  <p className="text-muted-foreground text-xs">
                    You&apos;ve used all {ragLimit} questions for today. Upgrade
                    for {LIMITS[PLANS.PRO].ragQueriesPerDay} per day.
                  </p>
                </div>
                {/* Usage bar */}
                <div className="w-full max-w-48">
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-destructive h-full rounded-full"
                      style={{ width: `${ragPct}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    {ragUsed} / {ragLimit} queries used
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => {
                      window.location.href = checkoutUrl;
                    }}
                  >
                    Upgrade — €{PRICING[PLANS.PRO].monthly}/mo
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    render={<Link href="/pricing" />}
                  >
                    Compare plans
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
