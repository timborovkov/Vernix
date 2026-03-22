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

    // Try to break at the last sentence boundary within the segment
    if (end < trimmed.length) {
      const segment = trimmed.slice(start, end);
      let lastBreak = -1;
      const re = /[.!?]\s+/g;
      let m;
      while ((m = re.exec(segment)) !== null) {
        lastBreak = m.index + 1; // position right after the punctuation
      }
      if (lastBreak > chunkSize * 0.3) {
        end = start + lastBreak;
      }
    }

    const segment = trimmed.slice(start, end).trim();
    if (segment.length > 0) {
      chunks.push({ text: segment, index: chunks.length });
    }

    // Stop if we've reached the end of the text
    if (end >= trimmed.length) break;

    // Move forward by chunk minus overlap, but never less than 1
    const step = end - start - overlap;
    start += Math.max(step, 1);
  }

  return chunks;
}
