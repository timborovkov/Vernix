import { z } from "zod/v4";

const envSchema = z
  .object({
    // Database
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    // Qdrant
    QDRANT_URL: z.string().default("http://localhost:6333"),

    // OpenAI
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),

    // Auth
    AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
    AUTH_URL: z.string().min(1, "AUTH_URL is required"),

    // App
    NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),

    // Analytics
    NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),

    // Sentry
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    NEXT_PUBLIC_SENTRY_ENABLED: z.enum(["true", "false"]).default("false"),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),

    // Meeting Bot
    MEETING_BOT_PROVIDER: z.enum(["recall", "mock"]),

    // Recall (required when provider is recall)
    RECALL_API_KEY: z.string().optional(),
    RECALL_API_URL: z.string().optional(),
    RECALL_WEBHOOK_SECRET: z.string().optional(),

    // OAuth (optional — SSO buttons only appear when configured)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),

    // S3
    S3_ENDPOINT: z.string().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_BUCKET: z.string().default("vernix-knowledge"),
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

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}
