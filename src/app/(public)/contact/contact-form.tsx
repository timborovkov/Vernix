"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HelpCircle,
  Bug,
  Lightbulb,
  Building2,
  Send,
  Check,
} from "lucide-react";

const TOPICS = [
  { id: "question", label: "Question", icon: HelpCircle },
  { id: "bug", label: "Bug report", icon: Bug },
  { id: "feature", label: "Feature request", icon: Lightbulb },
  { id: "enterprise", label: "Enterprise", icon: Building2 },
] as const;

type Topic = (typeof TOPICS)[number]["id"];

export function ContactForm() {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          email,
          name: name || undefined,
          company: company || undefined,
          message,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to send. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-12 text-center">
        <Check className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h2 className="mb-2 text-lg font-medium">Message sent</h2>
        <p className="text-muted-foreground text-sm">
          We&apos;ll get back to you within 24 hours.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-6"
          onClick={() => {
            setSubmitted(false);
            setTopic(null);
            setEmail("");
            setName("");
            setCompany("");
            setMessage("");
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Label className="mb-3 block">What can we help with?</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTopic(t.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-colors ${
                topic === t.id
                  ? "border-ring bg-accent font-medium"
                  : "border-border hover:border-ring/50"
              }`}
            >
              <t.icon
                className={`h-5 w-5 ${topic === t.id ? "text-foreground" : "text-muted-foreground"}`}
              />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {topic && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-destructive text-center text-sm">{error}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-name">
                Name{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="contact-name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          </div>

          {topic === "enterprise" && (
            <div className="space-y-2">
              <Label htmlFor="contact-company">Company</Label>
              <Input
                id="contact-company"
                placeholder="Your company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                autoComplete="organization"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="contact-message">Message</Label>
            <textarea
              id="contact-message"
              rows={4}
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border px-2.5 py-2 text-sm focus-visible:ring-3 focus-visible:outline-none"
              placeholder={
                topic === "bug"
                  ? "What happened? What did you expect?"
                  : topic === "feature"
                    ? "What would you like to see?"
                    : topic === "enterprise"
                      ? "Tell us about your team and needs"
                      : "How can we help?"
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={sending}>
            <Send className="mr-1 h-4 w-4" />
            {sending ? "Sending..." : "Send message"}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            We typically respond within 24 hours.
          </p>
        </form>
      )}
    </div>
  );
}
