"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface CreateMeetingDialogProps {
  onCreate: (
    title: string,
    joinLink: string,
    agenda?: string,
    silent?: boolean
  ) => Promise<void>;
}

export function CreateMeetingDialog({ onCreate }: CreateMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [agenda, setAgenda] = useState("");
  const [silent, setSilent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !joinLink) return;

    setLoading(true);
    try {
      await onCreate(title, joinLink, agenda || undefined, silent || undefined);
      setTitle("");
      setJoinLink("");
      setAgenda("");
      setSilent(false);
      setOpen(false);
    } catch {
      toast.error("Failed to create meeting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="accent" />}>
        <Plus className="mr-2 h-4 w-4" />
        New Meeting
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title</Label>
            <Input
              id="title"
              placeholder="Weekly standup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="joinLink">Join Link</Label>
            <Input
              id="joinLink"
              placeholder="https://meet.google.com/abc-defg-hij"
              type="url"
              value={joinLink}
              onChange={(e) => setJoinLink(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agenda">Agenda (optional)</Label>
            <textarea
              id="agenda"
              placeholder="Meeting goals, topics to discuss, prep notes..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={3}
              className="border-input bg-background placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="silent"
              checked={silent}
              onChange={(e) => setSilent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
            />
            <div>
              <Label htmlFor="silent">Silent Mode</Label>
              <p className="text-muted-foreground text-xs">
                Text-only — responds via meeting chat, no voice
              </p>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Supports Zoom, Google Meet, Microsoft Teams, and Cisco Webex.{" "}
            {silent
              ? "The agent will listen passively and respond via meeting chat when called by name (Vernix)."
              : "The AI agent will join and respond when called by name (Vernix, Agent, or Assistant)."}
          </p>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Meeting"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
