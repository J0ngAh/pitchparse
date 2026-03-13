import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test("loads with branding tab and action buttons", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Branding tab is default
    await expect(page.getByText("Company Name")).toBeVisible();
    await expect(page.getByText("Tagline")).toBeVisible();
    await expect(page.getByText("Primary Color")).toBeVisible();

    // Action buttons — Export, Reset, Save are regular buttons; Import is inside a label
    await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
    // Import button is wrapped in a label, verify it's in the page
    await expect(page.getByText("Import")).toBeVisible();
  });

  test("all tabs are navigable", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Scoring tab
    await page.getByRole("tab", { name: "Scoring" }).click();
    await expect(page.getByText("exceptional", { exact: false })).toBeVisible();

    // KPIs tab — may be empty if no KPIs configured
    await page.getByRole("tab", { name: "KPIs" }).click();
    // Just verify tab switched without error
    await page.waitForTimeout(500);

    // Call Phases tab — may be empty
    await page.getByRole("tab", { name: "Call Phases" }).click();
    await page.waitForTimeout(500);

    // Coaching tab
    await page.getByRole("tab", { name: "Coaching" }).click();
    await expect(page.getByText("Feedback Structure")).toBeVisible();
    await expect(page.getByText("Common Scenarios")).toBeVisible();
  });
});
