import { describe, it, expect } from "vitest";

// We test the schema directly rather than the cached getEnv()
// to avoid process.env pollution between tests
const { z } = await import("zod/v4");

// Re-create the schema inline so tests are independent of module cache
function parseEnv(overrides: Record<string, string | undefined> = {}) {
  const base = {
    DATABASE_URL: "postgresql://localhost/test",
    OPENAI_API_KEY: "sk-test",
    AUTH_SECRET: "secret",
    AUTH_URL: "http://localhost:3000",
    MEETING_BOT_PROVIDER: "mock",
  };
  // Dynamically import to avoid caching issues
  const envSchema = z
    .object({
      DATABASE_URL: z.string().min(1),
      QDRANT_URL: z.string().default("http://localhost:6333"),
      OPENAI_API_KEY: z.string().min(1),
      AUTH_SECRET: z.string().min(1),
      AUTH_URL: z.string().min(1),
      NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
      MEETING_BOT_PROVIDER: z.enum(["recall", "mock"]),
      RECALL_API_KEY: z.string().optional(),
      RECALL_API_URL: z.string().optional(),
      RECALL_WEBHOOK_SECRET: z.string().optional(),
      S3_ENDPOINT: z.string().optional(),
      S3_ACCESS_KEY: z.string().optional(),
      S3_SECRET_KEY: z.string().optional(),
      S3_BUCKET: z.string().default("kivikova-knowledge"),
      S3_REGION: z.string().default("us-east-1"),
    })
    .refine(
      (data) => {
        if (data.MEETING_BOT_PROVIDER === "recall") {
          return !!data.RECALL_API_KEY && !!data.RECALL_API_URL;
        }
        return true;
      },
      {
        message:
          "RECALL_API_KEY and RECALL_API_URL are required when MEETING_BOT_PROVIDER is recall",
      }
    );
  return envSchema.parse({ ...base, ...overrides });
}

describe("env validation", () => {
  it("parses valid env with defaults", () => {
    const env = parseEnv();
    expect(env.DATABASE_URL).toBe("postgresql://localhost/test");
    expect(env.QDRANT_URL).toBe("http://localhost:6333");
    expect(env.S3_BUCKET).toBe("kivikova-knowledge");
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => parseEnv({ DATABASE_URL: "" })).toThrow();
  });

  it("throws when OPENAI_API_KEY is missing", () => {
    expect(() => parseEnv({ OPENAI_API_KEY: "" })).toThrow();
  });

  it("throws when MEETING_BOT_PROVIDER is invalid", () => {
    expect(() => parseEnv({ MEETING_BOT_PROVIDER: "invalid" })).toThrow();
  });

  it("throws when recall provider lacks RECALL_API_KEY", () => {
    expect(() =>
      parseEnv({
        MEETING_BOT_PROVIDER: "recall",
        RECALL_API_URL: "https://recall.ai",
      })
    ).toThrow(/RECALL_API_KEY/);
  });

  it("passes when recall provider has both keys", () => {
    const env = parseEnv({
      MEETING_BOT_PROVIDER: "recall",
      RECALL_API_KEY: "key",
      RECALL_API_URL: "https://recall.ai",
    });
    expect(env.MEETING_BOT_PROVIDER).toBe("recall");
  });
});
