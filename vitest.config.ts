import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["src/**/*.integration.test.ts"],
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    clearMocks: true,
    environmentMatchGlobs: [["src/**/*.test.tsx", "happy-dom"]],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/api/**", "src/hooks/**"],
      exclude: ["src/test/**"],
    },
  },
});
