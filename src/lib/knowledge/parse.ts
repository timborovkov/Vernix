import mammoth from "mammoth";

export type FileType = "pdf" | "docx" | "txt" | "md";

/**
 * Extract text from a PDF buffer using pdfjs-dist legacy build.
 * Workers are automatically disabled in Node.js by pdfjs-dist,
 * so no workerSrc configuration is needed.
 */
async function parsePDF(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item): item is { str: string } => "str" in item)
      .map((item) => item.str)
      .join(" ");
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
