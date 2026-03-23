import archiver from "archiver";
import {
  formatMeetingMarkdown,
  slugify,
  type MeetingExportData,
} from "./markdown";

export async function generateMeetingsZip(
  data: MeetingExportData[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    // Deduplicate slugs
    const usedSlugs = new Set<string>();
    const meetingSlugs: string[] = [];
    for (const item of data) {
      const slug = slugify(item.meeting.title) || "meeting";
      let candidate = slug;
      let counter = 1;
      while (usedSlugs.has(candidate)) {
        candidate = `${slug}-${counter}`;
        counter++;
      }
      usedSlugs.add(candidate);
      meetingSlugs.push(candidate);
    }

    // Add markdown files
    for (let i = 0; i < data.length; i++) {
      const md = formatMeetingMarkdown(data[i]!);
      archive.append(md, { name: `meetings/${meetingSlugs[i]}/notes.md` });
    }

    // Add metadata.json
    const metadata = data.map((item) => ({
      id: item.meeting.id,
      title: item.meeting.title,
      status: item.meeting.status,
      startedAt: item.meeting.startedAt,
      endedAt: item.meeting.endedAt,
      createdAt: item.meeting.createdAt,
      participants: item.meeting.participants ?? [],
      taskCount: item.tasks.length,
    }));
    archive.append(JSON.stringify(metadata, null, 2), {
      name: "metadata.json",
    });

    archive.finalize();
  });
}
