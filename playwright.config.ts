import { defineConfig, devices } from "@playwright/test";

// Port of the production server the tests run against; E2E_PORT overrides the default.
const port = Number(process.env.E2E_PORT ?? 3000);

// A car page from the fixture catalogue. The server counts as ready only once it has answered this
// address, so its first read of the car slug list happens before the test workers load the machine.
const warmUpCarPath = "/pl/cars/alfa-romeo-giulia-sedan-hatchback-diesel-automatic-118kw";

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${port}`,
    url: `http://localhost:${port}${warmUpCarPath}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
