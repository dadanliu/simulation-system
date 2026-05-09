import { defineConfig, devices } from "@playwright/test";

const clientBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3200";

export default defineConfig({
  expect: {
    timeout: 10_000
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  outputDir: "test-results/playwright",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ],
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"], ["html", { open: "never" }]],
  retries: process.env.CI ? 1 : 0,
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: clientBaseUrl,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "node scripts/e2e-services.js",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: `${clientBaseUrl}/login`
  },
  workers: 1
});
