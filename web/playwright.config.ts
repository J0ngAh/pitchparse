import { defineConfig } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, "e2e", ".auth-state.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "html",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    storageState: AUTH_FILE,
  },
  projects: [
    // Auth tests run WITHOUT shared auth state (they test login/signup themselves)
    {
      name: "auth",
      testMatch: "auth.spec.ts",
      use: { storageState: undefined },
    },
    // Fast tests first — pages that don't trigger AI analysis
    {
      name: "authenticated",
      testMatch: [
        "dashboard.spec.ts",
        "billing.spec.ts",
        "reports.spec.ts",
        "settings.spec.ts",
        "transcripts.spec.ts",
      ],
      use: { storageState: AUTH_FILE },
    },
    // Slow pipeline tests last — these trigger Claude API calls (~2-3 min each)
    {
      name: "pipeline",
      testMatch: ["analyze.spec.ts", "call-detail.spec.ts"],
      use: { storageState: AUTH_FILE },
    },
  ],
  webServer: [
    {
      command: "cd .. && uvicorn api.main:app --port 8000",
      url: "http://localhost:8000/api/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
