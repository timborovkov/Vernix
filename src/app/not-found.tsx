import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VernixLogo } from "@/components/ui/vernix-logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <VernixLogo size={48} className="mb-8" />
      <div className="flex flex-col items-center text-center">
        <div className="bg-ring/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <FileQuestion className="text-ring h-8 w-8" />
        </div>
        <h1 className="mb-2 text-lg font-medium">Page not found</h1>
        <p className="text-muted-foreground mb-6 max-w-sm text-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button render={<Link href="/" />}>Go home</Button>
      </div>
    </div>
  );
}
