import { QdrantClient } from "@qdrant/js-client-rest";
import { getEnv } from "@/lib/env";

let client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!client) {
    const url = getEnv().QDRANT_URL;
    const parsed = new URL(url);
    client = new QdrantClient({
      url,
      // QdrantClient defaults port to 6333 when the URL uses an implicit port
      // (e.g., HTTPS on 443). Explicitly set the port from the parsed URL.
      port: parsed.port
        ? Number(parsed.port)
        : parsed.protocol === "https:"
          ? 443
          : 6333,
    });
  }
  return client;
}
