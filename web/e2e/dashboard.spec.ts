import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("shows empty state or dashboard content", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Should see dashboard — either empty state or populated
    const hasDashboard = await page
      .getByRole("heading", { name: "Dashboard" })
      .or(page.getByText("No analyses yet"))
      .first()
      .isVisible();
    expect(hasDashboard).toBe(true);
  });

  test("sidebar navigation works for all pages", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Use exact match for sidebar links to avoid collision with CTAs
    // Navigate to Analyze
    await page.getByRole("link", { name: "Analyze", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Analyze" })).toBeVisible();

    // Navigate to Transcripts
    await page.getByRole("link", { name: "Transcripts", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Transcripts" })).toBeVisible();

    // Navigate to Reports
    await page.getByRole("link", { name: "Reports", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();

    // Navigate to Settings
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Navigate to Billing
    await page.getByRole("link", { name: "Billing", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();

    // Navigate back to Dashboard
    await page.getByRole("link", { name: "Dashboard", exact: true }).click();
    await page.waitForLoadState("networkidle");
  });
});
