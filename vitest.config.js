import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    testTimeout: 10000,
    hookTimeout: 30000,

    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        "postgresql://biblioteca_test:test-only-password@127.0.0.1:5434/biblioteca_test",
      JWT_SECRET: "chave-publica-exclusiva-dos-testes",
      JWT_EXPIRES_IN: "1h",
    },

    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
    },
  },
});