import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { BookOpen, ArrowRight, FileText, Plug } from "lucide-react";

export const metadata: Metadata = {
  title: "Upload Docs, Get Answers During Calls | Vernix Knowledge Base",
  description:
    "Upload PDFs, specs, and reports. During video calls, ask questions and get answers from your actual documents. No more 'let me get back to you.'",
};

const USE_CASES = [
  {
    scenario:
      "A client asks about a deliverable from last quarter's statement of work.",
    before:
      'Say "Let me check and get back to you." Open Google Drive, search for the SOW, scroll through 40 pages.',
    after:
      '"Vernix, what does the SOW say about Q4 deliverables?" The agent quotes the exact section. Client is impressed.',
  },
  {
    scenario:
      "Your team debates whether a feature was in scope for the current release.",
    before:
      "Someone screen-shares the PRD. Everyone reads silently for 2 minutes. Momentum dies.",
    after:
      '"Vernix, is the export feature in the v2 PRD?" Instant answer with the relevant section. Debate resolved.',
  },
  {
    scenario:
      "New hire asks about company policies during their onboarding call.",
    before:
      "Promise to send the employee handbook after the call. Forget. They ask again next week.",
    after:
      "The handbook is in the knowledge base. Vernix answers their questions live, quoting the relevant section.",
  },
];

const SUPPORTED_FORMATS = [
  { format: "PDF", description: "Reports, SOWs, handbooks" },
  { format: "DOCX", description: "Specs, proposals, briefs" },
  { format: "TXT", description: "Notes, transcripts, logs" },
  { format: "Markdown", description: "Technical docs, READMEs" },
];

export default function ContextPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-24">
      {/* Hero */}
      <div className="mb-20 text-center">
        <div className="bg-ring/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
          <BookOpen className="text-ring h-8 w-8" />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          An agent that actually read the brief.
        </h1>
        <p className="text-muted-foreground mx-auto mb-8 max-w-xl text-lg">
          Upload your docs, specs, and reports. During calls, Vernix answers
          using your actual data, not generic AI responses.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="accent" size="lg" render={<Link href="/register" />}>
            Try free for 14 days
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/pricing" />}>
            See pricing
          </Button>
        </div>
      </div>

      {/* Use cases */}
      <ScrollReveal>
        <div className="mb-20">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Your data, answering questions live
          </h2>
          <div className="space-y-6">
            {USE_CASES.map((uc) => (
              <Card key={uc.scenario}>
                <CardContent className="p-6">
                  <p className="mb-4 text-sm font-semibold">{uc.scenario}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                        Without Vernix
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {uc.before}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-green-600 uppercase">
                        With Vernix
                      </p>
                      <p className="text-sm">{uc.after}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* How it works */}
      <ScrollReveal>
        <div className="mb-20">
          <h2 className="mb-8 text-center text-2xl font-bold">How it works</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="text-center">
              <div className="bg-ring text-ring-foreground mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                1
              </div>
              <h3 className="mb-1 font-semibold">Upload your docs</h3>
              <p className="text-muted-foreground text-sm">
                PDFs, DOCX, TXT, or Markdown. Drag and drop into your knowledge
                base.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-ring text-ring-foreground mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                2
              </div>
              <h3 className="mb-1 font-semibold">Start a meeting</h3>
              <p className="text-muted-foreground text-sm">
                Vernix automatically has access to your documents. You can also
                attach docs to specific meetings.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-ring text-ring-foreground mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                3
              </div>
              <h3 className="mb-1 font-semibold">Ask during the call</h3>
              <p className="text-muted-foreground text-sm">
                The agent combines your documents with the live conversation to
                give accurate, grounded answers.
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Supported formats */}
      <ScrollReveal>
        <div className="mb-20">
          <h2 className="mb-6 text-center text-2xl font-bold">
            Upload anything your team reads
          </h2>
          <div className="mx-auto grid max-w-md gap-3 sm:grid-cols-2">
            {SUPPORTED_FORMATS.map((f) => (
              <div
                key={f.format}
                className="border-border flex items-center gap-3 rounded-lg border px-4 py-3"
              >
                <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{f.format}</p>
                  <p className="text-muted-foreground text-xs">
                    {f.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-4 text-center text-xs">
            Free: 5 documents, 50MB. Pro: 200 documents, 500MB.
          </p>
        </div>
      </ScrollReveal>

      {/* Cross-sell */}
      <ScrollReveal>
        <div className="bg-muted/30 mb-20 rounded-xl p-6 text-center">
          <Plug className="text-muted-foreground mx-auto mb-3 h-6 w-6" />
          <p className="mb-1 text-sm font-medium">Docs are just the start</p>
          <p className="text-muted-foreground mb-3 text-xs">
            Pro users also connect live tools like Slack, Linear, and GitHub for
            real-time data during calls.
          </p>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/features/integrations" />}
          >
            Learn about integrations
          </Button>
        </div>
      </ScrollReveal>

      {/* Bottom CTA */}
      <div className="text-center">
        <h2 className="mb-3 text-2xl font-bold">
          Your docs deserve to be heard
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          14-day free trial. No charge until the trial ends.
        </p>
        <Button variant="accent" size="lg" render={<Link href="/register" />}>
          Get started free
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
