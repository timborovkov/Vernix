import { getQdrantClient } from "./client";

export interface TranscriptPoint {
  text: string;
  speaker: string;
  timestampMs: number;
}

export async function scrollTranscript(
  collectionName: string
): Promise<TranscriptPoint[]> {
  const client = getQdrantClient();
  const points: TranscriptPoint[] = [];
  let offset: string | number | Record<string, unknown> | undefined = undefined;

  do {
    const result = await client.scroll(collectionName, {
      limit: 100,
      with_payload: true,
      with_vector: false,
      offset,
      filter: {
        must: [{ key: "type", match: { value: "transcript" } }],
      },
    });

    for (const point of result.points) {
      const payload = point.payload as Record<string, unknown>;
      points.push({
        text: payload.text as string,
        speaker: payload.speaker as string,
        timestampMs: payload.timestamp_ms as number,
      });
    }

    offset = result.next_page_offset ?? undefined;
  } while (offset !== undefined);

  return points.sort((a, b) => a.timestampMs - b.timestampMs);
}
