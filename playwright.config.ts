import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3191",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: `node -e "require('node:fs').rmSync('.next/e2e', {recursive: true, force: true})" && node .next/standalone/server.js`,
    url: "http://127.0.0.1:3191",
    reuseExistingServer: false,
    env: {
      PORT: "3191",
      HOSTNAME: "127.0.0.1",
      ADMIN_KEY: "TestAdminKey1234",
      ADMIN_JWT_SECRET: "test-only-signing-secret-with-at-least-32-characters",
      ADMIN_COOKIE_SECURE: "false",
      APP_ORIGIN: "http://127.0.0.1:3191",
      DATABASE_PATH: resolve(".next/e2e/home.sqlite"),
    },
  },
});
