const { MockPDFParse, mockMammoth } = vi.hoisted(() => {
  class MockPDFParse {
    getText = vi.fn().mockResolvedValue({ text: "PDF content here" });
  }
  return {
    MockPDFParse,
    mockMammoth: {
      extractRawText: vi.fn().mockResolvedValue({ value: "DOCX content here" }),
    },
  };
});

vi.mock("pdf-parse", () => ({
  PDFParse: MockPDFParse,
}));

vi.mock("mammoth", () => ({
  default: mockMammoth,
}));

import { parseDocument } from "./parse";

describe("parseDocument", () => {
  it("parses PDF files", async () => {
    const buffer = Buffer.from("fake pdf");
    const result = await parseDocument(buffer, "pdf");

    expect(result).toBe("PDF content here");
    expect(result).toBe("PDF content here");
  });

  it("parses DOCX files", async () => {
    const buffer = Buffer.from("fake docx");
    const result = await parseDocument(buffer, "docx");

    expect(result).toBe("DOCX content here");
    expect(mockMammoth.extractRawText).toHaveBeenCalledWith({ buffer });
  });

  it("parses TXT files", async () => {
    const buffer = Buffer.from("Plain text content");
    const result = await parseDocument(buffer, "txt");
    expect(result).toBe("Plain text content");
  });

  it("parses MD files", async () => {
    const buffer = Buffer.from("# Heading\n\nMarkdown content");
    const result = await parseDocument(buffer, "md");
    expect(result).toBe("# Heading\n\nMarkdown content");
  });

  it("throws for unsupported file types", async () => {
    const buffer = Buffer.from("data");
    await expect(parseDocument(buffer, "xyz" as "txt")).rejects.toThrow(
      "Unsupported file type"
    );
  });
});
