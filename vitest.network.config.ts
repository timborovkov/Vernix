import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Config for network integration tests that don't need a database.
 * Run with: pnpm test:network
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.network.test.ts"],
    environment: "node",
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
