import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About — Vernix",
  description:
    "Vernix started as a hackathon idea: what if an AI agent could sit in your meeting, remember everything, and answer questions on the spot? Built by Tim Borovkov.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      {/* Hero */}
      <div className="mb-16 text-center">
        <Image
          src="/brand/icon/icon.svg"
          alt=""
          width={56}
          height={56}
          className="mx-auto mb-6 dark:hidden"
        />
        <Image
          src="/brand/icon/icon-dark.png"
          alt=""
          width={56}
          height={56}
          className="mx-auto mb-6 hidden dark:block"
        />
        <h1 className="mb-4 text-3xl font-bold">
          Meetings are where decisions happen. But the knowledge disappears.
        </h1>
        <p className="text-muted-foreground text-lg">
          Vernix exists to fix that.
        </p>
      </div>

      {/* Origin story */}
      <div className="space-y-6 text-sm leading-relaxed">
        <p>
          Vernix started with a question:{" "}
          <em>
            What if an AI agent could sit in your meeting, build a memory of
            everything said, and answer questions on the spot?
          </em>
        </p>

        <p>
          Not a recording you never rewatch. Not notes biased toward whoever
          happened to be typing. An actual participant that listens,
          understands, and remembers — across every call you have.
        </p>

        <p>
          The idea came from a hackathon. The first version was rough: a bot
          that joined Google Meet calls, transcribed them in real time, embedded
          every sentence into a vector database, and answered questions by
          voice. It worked. People asked it things during live meetings and got
          answers grounded in what had actually been said — not just in the
          current call, but across their entire meeting history.
        </p>

        <p>
          That was the moment it clicked. Meetings are the primary
          decision-making channel for most teams, but the knowledge generated in
          them is trapped — in people&apos;s heads, in forgotten recordings, in
          notes nobody reads. Decisions, context, and action items disappear the
          moment the call ends.
        </p>

        <p>
          Vernix turns that around. Every conversation becomes permanent,
          searchable, actionable knowledge. Summaries write themselves. Action
          items are extracted automatically. Your documents become part of the
          agent&apos;s context. And you can ask it anything — during the meeting
          or after — and get an answer grounded in what was actually said.
        </p>

        <h2 className="text-foreground pt-4 text-lg font-semibold">
          The vision
        </h2>

        <p>
          Vernix becomes your organization&apos;s collective brain. Not just
          meeting notes — meeting intelligence. Every decision, discussion, and
          insight permanently searchable and actionable.
        </p>

        <p>
          We&apos;re building this in the open, one feature at a time. Voice
          agent, silent mode, knowledge base, cross-meeting search, MCP
          integration — each piece makes the whole thing smarter.
        </p>

        <h2 className="text-foreground pt-4 text-lg font-semibold">Built by</h2>

        <div className="flex items-center gap-4 pt-2">
          <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold">
            T
          </div>
          <div>
            <p className="font-medium">Tim Borovkov</p>
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-3">
              <span>Founder &amp; developer</span>
              <a
                href="https://x.com/timborovkov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4"
              >
                @timborovkov
              </a>
              <a
                href="https://github.com/timborovkov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4"
              >
                GitHub
              </a>
            </p>
          </div>
        </div>

        <p className="text-muted-foreground pt-4 text-xs">
          Built with &hearts; in Europe.
        </p>
      </div>

      {/* CTA */}
      <div className="mt-16 text-center">
        <p className="text-muted-foreground mb-4 text-sm">
          Want to see what Vernix can do?
        </p>
        <Button variant="accent" size="lg" render={<Link href="/register" />}>
          Try Vernix Free
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
