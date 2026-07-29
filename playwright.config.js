import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/smoke",
  timeout: 30_000,
  expect: {
    timeout: 7_000,
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 14"],
      },
    },
  ],
});
