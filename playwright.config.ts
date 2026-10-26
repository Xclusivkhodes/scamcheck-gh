import { defineConfig, devices } from "@playwright/test";

const port = 4317;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      DEMO_MODE: "true",
      RATE_LIMIT_PER_MINUTE: "1000",
      RATE_LIMIT_PER_DAY: "10000",
      PIPELINE_CONCURRENCY: "8",
    },
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
