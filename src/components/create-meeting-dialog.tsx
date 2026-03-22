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
  onCreate: (title: string, joinLink: string) => Promise<void>;
}

export function CreateMeetingDialog({ onCreate }: CreateMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !joinLink) return;

    setLoading(true);
    try {
      await onCreate(title, joinLink);
      setTitle("");
      setJoinLink("");
      setOpen(false);
    } catch {
      toast.error("Failed to create meeting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
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
          <p className="text-muted-foreground text-xs">
            Supports Zoom, Google Meet, Microsoft Teams, and Cisco Webex. The AI
            agent will join and respond when called by name (KiviKova, Agent, or
            Assistant).
          </p>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Meeting"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
