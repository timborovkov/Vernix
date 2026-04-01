"use client";

import { ChatPanel } from "@/components/chat-panel";

interface ChatTabProps {
  meetingId: string;
}

export function ChatTab({ meetingId }: ChatTabProps) {
  return (
    <ChatPanel meetingId={meetingId} placeholder="Ask about this call..." />
  );
}
