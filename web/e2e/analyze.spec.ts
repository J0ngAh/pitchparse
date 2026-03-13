import { test, expect } from "@playwright/test";
import { SAMPLE_TRANSCRIPT } from "./helpers";

test.describe("Analyze Workflow", () => {
  test("page loads with tabs and analysis settings", async ({ page }) => {
    await page.goto("/analyze");
    await page.waitForLoadState("networkidle");

    // Page header
    await expect(page.getByRole("heading", { name: "Analyze" })).toBeVisible();

    // Tabs visible
    await expect(page.getByRole("tab", { name: "Select Existing" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Upload File" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Generate Synthetic" })).toBeVisible();

    // Analysis settings section
    await expect(page.getByText("Analysis Settings")).toBeVisible();
    await expect(page.getByRole("button", { name: "Run Analysis" })).toBeVisible();
  });

  test("upload transcript file and see it selected", async ({ page }) => {
    await page.goto("/analyze");
    await page.waitForLoadState("networkidle");

    // Switch to Upload tab
    await page.getByRole("tab", { name: "Upload File" }).click();
    await expect(page.getByText("Drag & drop a transcript")).toBeVisible();

    // Upload via file input
    const buffer = Buffer.from(SAMPLE_TRANSCRIPT);
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: `e2e-upload-${Date.now()}.md`,
      mimeType: "text/markdown",
      buffer,
    });

    // Wait for upload success toast
    await expect(page.getByText("Transcript uploaded!")).toBeVisible({
      timeout: 10_000,
    });

    // Run Analysis button should now be enabled
    const runBtn = page.getByRole("button", { name: "Run Analysis" });
    await expect(runBtn).toBeEnabled();
  });

  test("run analysis with polling and redirect", async ({ page }) => {
    test.setTimeout(360_000); // 6 min for AI analysis

    await page.goto("/analyze");
    await page.waitForLoadState("networkidle");

    // Upload transcript
    await page.getByRole("tab", { name: "Upload File" }).click();
    const buffer = Buffer.from(SAMPLE_TRANSCRIPT);
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: `e2e-analysis-${Date.now()}.md`,
      mimeType: "text/markdown",
      buffer,
    });
    await expect(page.getByText("Transcript uploaded!")).toBeVisible({
      timeout: 10_000,
    });

    // Run Analysis
    await page.getByRole("button", { name: "Run Analysis" }).click();

    // Should show "Analyzing..." polling status
    await expect(page.getByRole("paragraph").filter({ hasText: "Analyzing..." })).toBeVisible({ timeout: 10_000 });

    // Wait for "Analysis complete!" toast (analysis takes ~2-3 min)
    await expect(page.getByText("Analysis complete!").first()).toBeVisible({ timeout: 300_000 });

    // Next.js soft navigation to /calls/ — poll URL since waitForURL needs a full load
    await expect(async () => {
      expect(page.url()).toMatch(/\/calls\//);
    }).toPass({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Call Detail" })).toBeVisible({ timeout: 10_000 });
  });

  test("generate synthetic tab shows form", async ({ page }) => {
    await page.goto("/analyze");
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: "Generate Synthetic" }).click();
    await expect(page.getByText("Quality Level")).toBeVisible();
    await expect(page.getByText("Consultant Name")).toBeVisible();
    await expect(page.getByText("Prospect Name")).toBeVisible();
    await expect(page.getByText("Scenario")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate Transcript" })
    ).toBeVisible();
  });

  test("run analysis disabled without transcript selected", async ({ page }) => {
    await page.goto("/analyze");
    await page.waitForLoadState("networkidle");

    // Switch to Select Existing to ensure no transcript selected
    await page.getByRole("tab", { name: "Select Existing" }).click();

    const runBtn = page.getByRole("button", { name: "Run Analysis" });
    await expect(runBtn).toBeDisabled();
  });
});
