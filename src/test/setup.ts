import { vi, afterEach } from "vitest";

vi.stubEnv("DATABASE_URL", "postgres://fake:fake@localhost:5432/fake");
vi.stubEnv("QDRANT_URL", "http://localhost:6333");
vi.stubEnv("OPENAI_API_KEY", "sk-fake-key");
vi.stubEnv("MEETING_BOT_PROVIDER", "mock");
vi.stubEnv("AUTH_SECRET", "test-secret-for-vitest");

// Mock auth session for all route tests
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn().mockResolvedValue({
    id: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
    email: "test@example.com",
  }),
  requireSessionUser: vi.fn().mockResolvedValue({
    id: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
    email: "test@example.com",
  }),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
      email: "test@example.com",
    },
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
});
