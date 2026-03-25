"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, Settings, Download } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="border-border bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm">
      <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard">
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/dashboard/knowledge" />}
          >
            <BookOpen className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Knowledge</span>
          </Button>
          <Button variant="outline" size="sm" render={<a href="/api/export" />}>
            <Download className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/dashboard/settings" />}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
