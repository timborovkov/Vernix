import type { Metadata } from "next";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard-header";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Dashboard — Vernix",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardHeader />
      <div className="flex-1">{children}</div>
      <footer className="border-border text-muted-foreground border-t py-6">
        <div className="container mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-xs">
          <span>
            &copy; {new Date().getFullYear()} Vernix &middot; Built with
            &hearts; in Europe
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/contact"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </>
  );
}
