import { GithubIcon } from "@/components/icons/github";

export function OpenSourceBadge() {
  return (
    <a
      href="https://github.com/timborovkov/Vernix"
      target="_blank"
      rel="noopener noreferrer"
      className="border-border bg-muted/50 hover:bg-muted mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
    >
      <GithubIcon className="h-3.5 w-3.5" />
      Open Source
    </a>
  );
}
