import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plug } from "lucide-react";
import {
  getFeaturedIntegrations,
  getIntegrations,
} from "@/lib/integrations/catalog";

interface IntegrationCloudProps {
  showCta?: boolean;
  ctaHref?: string;
  ctaText?: string;
}

export function IntegrationCloud({
  showCta = true,
  ctaHref = "/register",
  ctaText = "Try free for 14 days",
}: IntegrationCloudProps) {
  // Collect example prompts from all integrations
  const prompts = getIntegrations()
    .flatMap((i) => i.examplePrompts)
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Logo cloud */}
      <div className="flex flex-wrap items-center justify-center gap-6">
        {getFeaturedIntegrations().map((integration) => (
          <div
            key={integration.id}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
              <Image
                src={integration.logo}
                alt={integration.name}
                width={28}
                height={28}
                className="opacity-80"
              />
            </div>
            <span className="text-muted-foreground text-xs">
              {integration.name}
            </span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
            <Plug className="text-muted-foreground h-6 w-6" />
          </div>
          <span className="text-muted-foreground text-xs">+ more</span>
        </div>
      </div>

      {/* Example prompts */}
      <div className="mx-auto max-w-lg">
        <p className="text-muted-foreground mb-3 text-center text-xs font-medium tracking-wide uppercase">
          Questions you can ask during calls
        </p>
        <div className="space-y-2">
          {prompts.map((prompt) => (
            <div
              key={prompt}
              className="bg-muted/50 rounded-lg px-4 py-2 text-center text-sm italic"
            >
              &quot;{prompt}&quot;
            </div>
          ))}
        </div>
      </div>

      {/* Extensibility message */}
      <p className="text-muted-foreground text-center text-xs">
        Works with any MCP-compatible server. Thousands of integrations
        available.
      </p>

      {/* CTA */}
      {showCta && (
        <div className="text-center">
          <Button variant="accent" size="lg" render={<Link href={ctaHref} />}>
            {ctaText}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
