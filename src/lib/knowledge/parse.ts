import mammoth from "mammoth";

export type FileType = "pdf" | "docx" | "txt" | "md";

/**
 * Extract text from a PDF buffer using pdfjs-dist legacy build.
 * Dynamic import avoids worker issues in Next.js server bundles.
 * Setting workerSrc to the actual worker file allows pdfjs to
 * set up its "fake worker" (main-thread fallback) correctly.
 */
async function parsePDF(buffer: Buffer): Promise<string> {
  const { createRequire } = await import("module");
  const req = createRequire(import.meta.url);
  const workerSrc = req.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ");
    pages.push(text);
  }

  return pages.join("\n");
}

export async function parseDocument(
  buffer: Buffer,
  fileType: FileType
): Promise<string> {
  switch (fileType) {
    case "pdf":
      return parsePDF(buffer);
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case "txt":
    case "md":
      return new TextDecoder().decode(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
