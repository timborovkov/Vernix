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
  {
    id: "question",
    label: "Question",
    icon: HelpCircle,
    subject: "General question",
  },
  {
    id: "bug",
    label: "Bug report",
    icon: Bug,
    subject: "Bug report",
  },
  {
    id: "feature",
    label: "Feature request",
    icon: Lightbulb,
    subject: "Feature request",
  },
  {
    id: "enterprise",
    label: "Enterprise",
    icon: Building2,
    subject: "Enterprise inquiry",
  },
] as const;

type Topic = (typeof TOPICS)[number]["id"];

export function ContactForm() {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const selectedTopic = TOPICS.find((t) => t.id === topic);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic) return;

    const subject = encodeURIComponent(
      `[${selectedTopic.subject}] from ${name || email}`
    );
    const body = encodeURIComponent(
      [
        `Topic: ${selectedTopic.subject}`,
        `From: ${name || "—"} <${email}>`,
        company ? `Company: ${company}` : null,
        "",
        message,
      ]
        .filter(Boolean)
        .join("\n")
    );

    window.location.href = `mailto:hello@vernix.app?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="py-12 text-center">
        <Check className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h2 className="mb-2 text-lg font-medium">
          Your email client should have opened
        </h2>
        <p className="text-muted-foreground text-sm">
          If it didn&apos;t, send your message directly to{" "}
          <a
            href="mailto:hello@vernix.app"
            className="text-foreground underline"
          >
            hello@vernix.app
          </a>
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
      {/* Topic selector */}
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

      {/* Form — shown after topic selection */}
      {topic && (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <Button type="submit" className="w-full">
            <Send className="mr-1 h-4 w-4" />
            Send message
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            Opens your email client. We respond within 24 hours.
          </p>
        </form>
      )}
    </div>
  );
}
