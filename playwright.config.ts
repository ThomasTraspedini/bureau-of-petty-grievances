import { tmpdir } from "node:os";
import { join } from "node:path";

import { defineConfig, devices } from "@playwright/test";

const embeddedTestDatabasePath = join(
  tmpdir(),
  `bureau-playwright-public-records-${String(process.pid)}`,
);
const evaluationToken = `eva_${"E".repeat(43)}`;
const standardToken = `std_${"S".repeat(43)}`;
const standardSession = `sts_${"T".repeat(43)}`;

export default defineConfig({
  testDir: "./tests/e2e",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node --experimental-strip-types tests/e2e/start-test-server.mjs",
    env: {
      ...process.env,
      OPENAI_API_KEY: "",
      DATABASE_URL: "",
      BUREAU_PUBLIC_ORIGIN: "http://127.0.0.1:4173",
      BUREAU_EMBEDDED_DATABASE_PATH: embeddedTestDatabasePath,
      BUREAU_NETWORK_HMAC_SECRET: "bureau-e2e-network-hmac-secret-32-bytes",
      BUREAU_TRUSTED_PROXY_HOPS: "0",
      BUREAU_E2E_EVALUATION_TOKEN: evaluationToken,
      BUREAU_E2E_STANDARD_TOKEN: standardToken,
      BUREAU_E2E_STANDARD_SESSION: standardSession,
    },
    url: "http://127.0.0.1:4173/en",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
