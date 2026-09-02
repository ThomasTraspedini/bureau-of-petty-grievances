import { defineConfig, devices } from "@playwright/test";

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
    command: "npm run start -- --hostname 127.0.0.1 --port 4173",
    env: {
      ...process.env,
      OPENAI_API_KEY: "",
      DATABASE_URL: "",
      BUREAU_EMBEDDED_DATABASE_PATH: ".data/playwright-public-records",
    },
    url: "http://127.0.0.1:4173/en",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
