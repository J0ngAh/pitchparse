import { test, expect } from "@playwright/test";

test.describe("Billing Page", () => {
  test("shows current usage and plan cards", async ({ page }) => {
    await page.goto("/billing");
    await page.waitForLoadState("networkidle");

    // Page header
    await expect(page.getByText("Manage your subscription")).toBeVisible();

    // Current usage section
    await expect(page.getByText("Current Usage")).toBeVisible();
    await expect(page.getByText("Analyses used")).toBeVisible();

    // Plan card titles (exact match to avoid badge collision)
    await expect(page.getByText("Free", { exact: true })).toBeVisible();
    await expect(page.getByText("Starter", { exact: true })).toBeVisible();
    await expect(page.getByText("Team", { exact: true })).toBeVisible();

    // Pricing
    await expect(page.getByText("$0")).toBeVisible();
    await expect(page.getByText("$99")).toBeVisible();
    await expect(page.getByText("$249")).toBeVisible();
  });

  test("upgrade buttons are visible for non-current plans", async ({ page }) => {
    await page.goto("/billing");
    await page.waitForLoadState("networkidle");

    const upgradeButtons = page.getByRole("button", { name: "Upgrade" });
    const count = await upgradeButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("plan features are listed", async ({ page }) => {
    await page.goto("/billing");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("5 analyses/month")).toBeVisible();
    await expect(page.getByText("50 analyses/month")).toBeVisible();
    await expect(page.getByText("Unlimited analyses")).toBeVisible();
  });
});
