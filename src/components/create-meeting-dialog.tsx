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
import { Plus, Mic } from "lucide-react";
import { isBillingError } from "@/lib/billing/errors";
import { useBilling } from "@/hooks/use-billing";
import {
  UpgradeDialog,
  detectPaywallTrigger,
  type PaywallTrigger,
} from "@/components/upgrade-dialog";

interface CreateMeetingDialogProps {
  onCreate: (
    title: string,
    joinLink: string,
    agenda?: string,
    silent?: boolean
  ) => Promise<void>;
}

export function CreateMeetingDialog({ onCreate }: CreateMeetingDialogProps) {
  const { billing } = useBilling();
  const voiceDisabled = billing ? !billing.limits.voiceEnabled : false;

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [agenda, setAgenda] = useState("");
  const [silent, setSilent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState<PaywallTrigger | null>(
    null
  );
  const [paywallMessage, setPaywallMessage] = useState<string>("");

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
    } catch (error) {
      if (isBillingError(error)) {
        const trigger = detectPaywallTrigger(
          error.message,
          error.isFeatureGate
        );
        setPaywallTrigger(trigger);
        setPaywallMessage(error.message);
      } else {
        toast.error("Failed to create meeting");
      }
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
              checked={voiceDisabled ? true : silent}
              onChange={(e) => !voiceDisabled && setSilent(e.target.checked)}
              disabled={voiceDisabled}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
            />
            <div>
              <Label htmlFor="silent">Silent Mode</Label>
              <p className="text-muted-foreground text-xs">
                Text-only — responds via meeting chat, no voice
              </p>
            </div>
          </div>
          {voiceDisabled && (
            <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2">
              <Mic className="text-muted-foreground h-4 w-4 shrink-0" />
              <p className="text-muted-foreground text-xs">
                Want the agent to answer out loud, pull live data, and take
                action?{" "}
                <a
                  href="/pricing"
                  className="text-foreground underline underline-offset-2"
                >
                  Start a Pro trial
                </a>{" "}
                to connect your tools and unlock the voice agent.
              </p>
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Supports Zoom, Google Meet, Microsoft Teams, and Cisco Webex.{" "}
            {silent || voiceDisabled
              ? "The agent will listen passively and respond via meeting chat when called by name (Vernix)."
              : "The AI agent will join and respond when called by name (Vernix, Agent, or Assistant)."}
          </p>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Meeting"}
          </Button>
        </form>
      </DialogContent>
      {paywallTrigger && (
        <UpgradeDialog
          open
          onOpenChange={(v) => !v && setPaywallTrigger(null)}
          trigger={paywallTrigger}
          errorMessage={paywallMessage}
        />
      )}
    </Dialog>
  );
}
