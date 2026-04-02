import Link from "next/link";
import Image from "next/image";
import { CookiePreferencesButton } from "@/components/cookie-preferences-button";

const PRODUCT_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const DEVELOPER_LINKS = [
  { href: "/docs", label: "API Docs" },
  { href: "/api/v1/openapi.json", label: "OpenAPI Spec" },
  { href: "/llms.txt", label: "llms.txt" },
];

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/cookie-policy", label: "Cookie Policy" },
];

const isAnalyticsEnabled =
  Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) ||
  Boolean(process.env.NEXT_PUBLIC_CONTENTSQUARE_TAG);

export function SiteFooter() {
  return (
    <footer className="border-border border-t">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-4">
          <div>
            <div className="mb-3">
              <Image
                src="/brand/combo/horizontal-nobg.png"
                alt="Vernix"
                width={100}
                height={28}
                className="dark:hidden"
              />
              <Image
                src="/brand/combo/horizontal-dark-nobg.png"
                alt="Vernix"
                width={100}
                height={28}
                className="hidden dark:block"
              />
            </div>
            <p className="text-muted-foreground text-sm">
              AI-powered meeting assistant for video calls.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Product</h3>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Developers</h3>
            <ul className="space-y-2">
              {DEVELOPER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    target="_blank"
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Legal</h3>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {isAnalyticsEnabled ? (
                <li>
                  <CookiePreferencesButton />
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="border-border text-muted-foreground mt-12 flex flex-col items-center gap-1 border-t pt-6 text-xs">
          <span>
            &copy; {new Date().getFullYear()} Vernix. All rights reserved.
          </span>
          <span>Built with &hearts; in Europe</span>
        </div>
      </div>
    </footer>
  );
}
