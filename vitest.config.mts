import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

export default defineConfig({
  resolve: {
    alias: {
      "@config": fileURLToPath(new URL("./config", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Tests make many Gemini calls with fake answers: no per-minute pacing.
  test: { include: ["tests/**/*.test.ts"], env: { GEMINI_PER_MINUTE: "1000" } },
});
