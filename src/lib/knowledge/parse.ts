import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export type FileType = "pdf" | "docx" | "txt" | "md";

export async function parseDocument(
  buffer: Buffer,
  fileType: FileType
): Promise<string> {
  switch (fileType) {
    case "pdf": {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      return result.text;
    }
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
