import { vi, afterEach } from "vitest";

vi.stubEnv("DATABASE_URL", "postgres://fake:fake@localhost:5432/fake");
vi.stubEnv("QDRANT_URL", "http://localhost:6333");
vi.stubEnv("OPENAI_API_KEY", "sk-fake-key");
vi.stubEnv("MEETING_BOT_PROVIDER", "mock");

afterEach(() => {
  vi.clearAllMocks();
});
