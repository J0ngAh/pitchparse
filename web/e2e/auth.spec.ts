import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("signup with short password shows validation error", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Your Name").fill("Test");
    await page.getByLabel("Organization").fill("Test Org");
    await page.getByLabel("Email").fill("test@test.com");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(
      page.getByText("Password must be at least 8 characters")
    ).toBeVisible();
  });

  test("unauthenticated user is redirected to login", async ({ browser }) => {
    // Create a truly clean context — no storage state at all
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    // Clear localStorage before navigating
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto("http://localhost:3000/dashboard");
    // Dashboard layout redirects unauthenticated users to /login via Next.js router.push
    await expect(async () => {
      expect(page.url()).toMatch(/\/login/);
    }).toPass({ timeout: 15_000 });
    await context.close();
  });

  test("navigation between login and signup works", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/signup/);
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Pitch|Parse")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("signup page renders correctly", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByText("Pitch|Parse")).toBeVisible();
    await expect(page.getByLabel("Your Name")).toBeVisible();
    await expect(page.getByLabel("Organization")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create account" })
    ).toBeVisible();
  });
});
