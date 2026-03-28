"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, X, ChevronDown, Plug, Search, BookOpen } from "lucide-react";

const FEATURE_LINKS = [
  {
    href: "/features/integrations",
    label: "Tool Integrations",
    description: "Connect your tools, get live answers",
    icon: Plug,
  },
  {
    href: "/features/meeting-memory",
    label: "Meeting Memory",
    description: "Transcripts, search, and summaries",
    icon: Search,
  },
  {
    href: "/features/context",
    label: "Knowledge Base",
    description: "Upload docs for grounded answers",
    icon: BookOpen,
  },
];

const NAV_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);

  return (
    <header className="border-border bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/">
          <Image
            src="/brand/combo/horizontal-nobg.png"
            alt="Vernix"
            width={120}
            height={32}
            className="dark:hidden"
          />
          <Image
            src="/brand/combo/horizontal-dark-nobg.png"
            alt="Vernix"
            width={120}
            height={32}
            className="hidden dark:block"
          />
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-6 md:flex"
        >
          {/* Features dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setFeaturesOpen(true)}
            onMouseLeave={() => setFeaturesOpen(false)}
          >
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
              onClick={() => setFeaturesOpen(!featuresOpen)}
            >
              Features
              <ChevronDown className="h-3 w-3" />
            </button>
            {featuresOpen && (
              <div className="border-border bg-background absolute top-full left-0 mt-2 w-72 rounded-lg border p-2 shadow-lg">
                {FEATURE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="hover:bg-muted flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors"
                    onClick={() => setFeaturesOpen(false)}
                  >
                    <link.icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{link.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {link.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" render={<Link href="/login" />}>
            Sign In
          </Button>
          <Button variant="accent" size="sm" render={<Link href="/register" />}>
            Get Started
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {mobileOpen && (
        <div className="border-border border-t px-4 pb-4 md:hidden">
          <nav
            aria-label="Mobile navigation"
            className="flex flex-col gap-2 pt-2"
          >
            <p className="text-muted-foreground px-2 pt-2 text-xs font-medium uppercase">
              Features
            </p>
            {FEATURE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 py-2 pl-2 text-sm"
                onClick={() => setMobileOpen(false)}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            <div className="border-border my-1 border-t" />
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground py-2 text-sm"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="outline" size="sm" render={<Link href="/login" />}>
              Sign In
            </Button>
            <Button
              variant="accent"
              size="sm"
              render={<Link href="/register" />}
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
