export interface Chunk {
  text: string;
  index: number;
}

export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

/**
 * Split text into overlapping chunks, preferring sentence boundaries.
 */
export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const chunkSize = options.chunkSize ?? 1000;
  const overlap = options.overlap ?? 200;

  const trimmed = text.trim();
  if (trimmed.length === 0) return [];
  if (trimmed.length <= chunkSize) return [{ text: trimmed, index: 0 }];

  const chunks: Chunk[] = [];
  let start = 0;

  while (start < trimmed.length) {
    let end = Math.min(start + chunkSize, trimmed.length);

    // Try to break at sentence boundary if not at end of text
    if (end < trimmed.length) {
      const segment = trimmed.slice(start, end);
      const lastSentenceEnd = segment.search(/[.!?]\s+\S[^]*$/);
      if (lastSentenceEnd > chunkSize * 0.3) {
        end = start + lastSentenceEnd + 1;
      }
    }

    const chunkText = trimmed.slice(start, end).trim();
    if (chunkText.length > 0) {
      chunks.push({ text: chunkText, index: chunks.length });
    }

    // Move forward by chunk minus overlap
    const step = end - start - overlap;
    start += Math.max(step, 1);
  }

  return chunks;
}
