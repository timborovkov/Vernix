import Link from "next/link";
import Image from "next/image";

const PRODUCT_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
];

export function SiteFooter() {
  return (
    <footer className="border-border border-t">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Image
                src="/brand/icon/icon.svg"
                alt=""
                width={24}
                height={24}
                className="dark:hidden"
              />
              <Image
                src="/brand/icon/icon-dark.png"
                alt=""
                width={24}
                height={24}
                className="hidden dark:block"
              />
              <span className="font-bold">Vernix</span>
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
            </ul>
          </div>
        </div>

        <div className="border-border text-muted-foreground mt-12 border-t pt-6 text-center text-xs">
          &copy; {new Date().getFullYear()} Vernix. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
