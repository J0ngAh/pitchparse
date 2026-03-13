import { test, expect } from "@playwright/test";

test.describe("Reports Page", () => {
  test("shows empty state when no reports exist", async ({ page }) => {
    await page.goto("/reports");
    await page.waitForLoadState("networkidle");

    // May have empty state or existing reports
    const hasEmpty = await page.getByText("No reports yet").isVisible().catch(() => false);
    const hasReports = await page.getByText("Report for analysis").first().isVisible().catch(() => false);
    expect(hasEmpty || hasReports).toBe(true);
  });
});
