import { FileQuestion } from "lucide-react";
import type { ReactNode } from "react";

export function NotFoundContent({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="bg-ring/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <FileQuestion className="text-ring h-8 w-8" />
      </div>
      <h1 className="mb-2 text-lg font-medium">Page not found</h1>
      <p className="text-muted-foreground mb-6 max-w-sm text-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      {children}
    </>
  );
}
