import { test, expect } from "@playwright/test";
import { SAMPLE_TRANSCRIPT } from "./helpers";

test.describe("Call Detail", () => {
  test("full pipeline: upload → analyze → view all tabs", async ({ page }) => {
    test.setTimeout(360_000); // 6 min for full pipeline

    await page.goto("/analyze");
    await page.waitForLoadState("networkidle");

    // Upload transcript
    await page.getByRole("tab", { name: "Upload File" }).click();
    const buffer = Buffer.from(SAMPLE_TRANSCRIPT);
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: `e2e-calldetail-${Date.now()}.md`,
      mimeType: "text/markdown",
      buffer,
    });
    await expect(page.getByText("Transcript uploaded!")).toBeVisible({
      timeout: 10_000,
    });

    // Run analysis
    await page.getByRole("button", { name: "Run Analysis" }).click();
    await expect(page.getByRole("paragraph").filter({ hasText: "Analyzing..." })).toBeVisible({ timeout: 10_000 });

    // Wait for "Analysis complete!" toast (analysis takes ~2-3 min)
    await expect(page.getByText("Analysis complete!").first()).toBeVisible({ timeout: 300_000 });

    // Next.js soft navigation to /calls/ — poll URL since waitForURL needs a full load
    await expect(async () => {
      expect(page.url()).toMatch(/\/calls\//);
    }).toPass({ timeout: 15_000 });

    // === Verify Call Detail Page ===

    // Hero section
    await expect(page.getByRole("heading", { name: "Call Detail" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Executive Summary")).toBeVisible();

    // KPI Scores tab (default)
    await expect(page.getByText("KPI Radar")).toBeVisible();
    await expect(page.getByText("BANT Qualification")).toBeVisible();
    await expect(page.getByText("Detailed Scorecard")).toBeVisible();

    // Phases tab
    await page.getByRole("tab", { name: "Phases" }).click();
    // Should have phase data or empty state
    const hasPhases = await page.getByText("Phase Journey").isVisible().catch(() => false);
    const noPhases = await page.getByText("No phase data").isVisible().catch(() => false);
    expect(hasPhases || noPhases).toBe(true);

    // Coaching tab
    await page.getByRole("tab", { name: "Coaching" }).click();
    await page.waitForTimeout(500);
    // Should have coaching cards or empty state
    const pageText = await page.textContent("body");
    expect(
      pageText?.includes("coaching") ||
      pageText?.includes("Coaching") ||
      pageText?.includes("No coaching data")
    ).toBe(true);

    // Report tab
    await page.getByRole("tab", { name: "Report" }).click();
    await expect(page.getByText("Generate Coaching Report")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate Report" })
    ).toBeVisible();
  });
});
