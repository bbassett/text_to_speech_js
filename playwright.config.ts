import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "web-chromium",
      testDir: "./tests/web",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "web-firefox",
      testDir: "./tests/web",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "chrome-extension",
      testDir: "./tests/extension",
    },
    {
      name: "firefox-lint",
      testDir: "./tests/firefox",
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
