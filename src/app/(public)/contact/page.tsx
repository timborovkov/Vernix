import type { Metadata } from "next";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact — Vernix",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="mb-4 text-3xl font-bold">Contact Us</h1>
      <p className="text-muted-foreground mb-8">
        Have a question, feature request, or need help? We&apos;d love to hear
        from you.
      </p>

      <a
        href="mailto:hello@vernix.app"
        className="bg-muted hover:bg-muted/80 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-colors"
      >
        <Mail className="h-4 w-4" />
        hello@vernix.app
      </a>

      <p className="text-muted-foreground mt-8 text-sm">
        We typically respond within 24 hours.
      </p>
    </div>
  );
}
