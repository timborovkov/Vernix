export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function renderMarkdown(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  const blocks = escaped.split(/\n{2,}/);

  return blocks
    .filter((block) => block.trim().length > 0)
    .map((block) => {
      const lines = block.trim().split("\n");
      if (lines.length > 0 && lines.every((l) => l.startsWith("- "))) {
        const items = lines.map((l) => `<li>${l.slice(2)}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${lines.join("<br>")}</p>`;
    })
    .join("");
}
