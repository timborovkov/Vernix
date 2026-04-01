import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  MessageSquareText,
  Sparkles,
  Zap,
} from "lucide-react";

import { auth } from "@/lib/auth";
import {
  getIntegrations,
  CATEGORIES,
  type Integration,
} from "@/lib/integrations/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamicParams = false;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getIntegrations().map((i) => ({ slug: i.id }));
}

function findIntegration(slug: string): Integration | undefined {
  return getIntegrations().find((i) => i.id === slug);
}

function getCategoryLabel(category: Integration["category"]): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

const AUTH_LABELS: Record<string, string> = {
  oauth: "One-click OAuth",
  token: "API token",
  api_key: "API key",
  url_key: "API key (in URL)",
  none: "No authentication",
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const integration = findIntegration(slug);
  if (!integration) return {};

  const title = `${integration.name} Integration for Video Calls | Vernix`;
  const description = `Use ${integration.name} during Zoom, Meet, and Teams calls. ${integration.description} Ask questions and get live answers without leaving the call.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${BASE_URL}/integration/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function IntegrationPage({ params }: Props) {
  const { slug } = await params;
  const integration = findIntegration(slug);
  if (!integration) notFound();

  const session = await auth();
  const isLoggedIn = !!session?.user;
  const ctaHref = isLoggedIn ? "/dashboard/integrations" : "/register";
  const ctaText = isLoggedIn
    ? `Connect ${integration.name}`
    : `Get Started with ${integration.name}`;

  const categoryLabel = getCategoryLabel(integration.category);
  const relatedIntegrations = getIntegrations()
    .filter((i) => i.category === integration.category && i.id !== slug)
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${integration.name} Integration for Video Calls`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: `Use ${integration.name} during Zoom, Google Meet, and Microsoft Teams calls. ${integration.description}`,
    url: `${BASE_URL}/integration/${slug}`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description:
        "Free plan available. Pro plan for voice agent and integrations.",
    },
    publisher: {
      "@type": "Organization",
      name: "Vernix",
      url: BASE_URL,
    },
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/features/integrations"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All integrations
      </Link>

      <header className="mb-12">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white shadow-sm">
            <Image
              src={integration.logo}
              alt={`${integration.name} logo`}
              width={40}
              height={40}
            />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {integration.name} Integration for Video Calls
              </h1>
              {integration.status === "coming-soon" && (
                <Badge variant="secondary">Coming Soon</Badge>
              )}
            </div>
          </div>
        </div>

        <p className="text-muted-foreground mb-6 text-base leading-relaxed">
          Connect {integration.name} to Vernix and access{" "}
          {integration.description.toLowerCase().replace(/\.$/, "")} — directly
          during your Zoom, Google Meet, Microsoft Teams, or Webex calls. No
          tab-switching, no screen-sharing. Just ask and get answers from{" "}
          {integration.name} in real time.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{categoryLabel}</Badge>
          {integration.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </header>

      {/* What you can do */}
      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <MessageSquareText className="text-muted-foreground h-5 w-5" />
          What you can do
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Ask Vernix questions like these during your calls and get live answers
          from {integration.name}:
        </p>
        <ul className="space-y-3">
          {integration.examplePrompts.map((prompt) => (
            <li
              key={prompt}
              className="bg-muted rounded-lg border px-4 py-3 text-sm"
            >
              &ldquo;{prompt}&rdquo;
            </li>
          ))}
        </ul>
      </section>

      {/* How it looks */}
      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Sparkles className="text-muted-foreground h-5 w-5" />
          How it looks
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Vernix responds with real data pulled from {integration.name}:
        </p>
        <ul className="space-y-3">
          {integration.sampleResponses.map((response) => (
            <li
              key={response}
              className="rounded-r-lg border-l-4 border-l-violet-500 bg-violet-500/5 px-4 py-3 text-sm"
            >
              {response}
            </li>
          ))}
        </ul>
      </section>

      {/* Getting started */}
      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Zap className="text-muted-foreground h-5 w-5" />
          Getting started
        </h2>
        <div className="border-border divide-border divide-y rounded-lg border">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-muted-foreground text-sm">
              Connection method
            </span>
            <span className="text-sm font-medium">
              {AUTH_LABELS[integration.authMode] ?? integration.authMode}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-muted-foreground text-sm">Setup</span>
            <span className="text-sm">{integration.setupInstructions}</span>
          </div>
          {integration.docsUrl && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted-foreground text-sm">
                Documentation
              </span>
              <a
                href={integration.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ring hover:text-ring/80 inline-flex items-center gap-1.5 text-sm transition-colors"
              >
                {integration.name} docs
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-muted-foreground text-sm">Status</span>
            <Badge
              variant={
                integration.status === "available" ? "default" : "secondary"
              }
              className="text-xs"
            >
              {integration.status === "available"
                ? "Available now"
                : "Coming soon"}
            </Badge>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="border-border rounded-lg border p-8 text-center">
        <p className="mb-2 text-lg font-semibold">
          Bring {integration.name} into your next call
        </p>
        <p className="text-muted-foreground mb-6 text-sm">
          {integration.status === "coming-soon"
            ? `${integration.name} integration is coming soon. Sign up to get notified.`
            : `Connect ${integration.name} and start getting live answers during your video calls.`}
        </p>
        <Button variant="accent" size="lg" render={<Link href={ctaHref} />}>
          {ctaText}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {/* Related integrations */}
      {relatedIntegrations.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">
            Other {categoryLabel} integrations
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {relatedIntegrations.map((related) => (
              <Link
                key={related.id}
                href={`/integration/${related.id}`}
                className="border-border hover:border-ring/40 hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Image
                    src={related.logo}
                    alt={related.name}
                    width={20}
                    height={20}
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium">{related.name}</span>
                  <p className="text-muted-foreground truncate text-xs">
                    {related.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer nav */}
      <div className="border-border mt-8 border-t pt-8">
        <Link
          href="/features/integrations"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          See all integrations
        </Link>
      </div>
    </article>
  );
}
