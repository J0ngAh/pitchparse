import { test, expect } from "@playwright/test";
import { SAMPLE_TRANSCRIPT } from "./helpers";

test.describe("Transcripts Page", () => {
  test("shows transcripts list or empty state", async ({ page }) => {
    await page.goto("/transcripts");
    await page.waitForLoadState("networkidle");

    // Should show the page heading
    await expect(page.getByRole("heading", { name: "Transcripts" })).toBeVisible();

    // Then either search bar (has transcripts) or empty state
    const hasTranscripts = await page.getByPlaceholder("Search by filename").isVisible().catch(() => false);
    const isEmpty = await page.getByText("No transcripts").isVisible().catch(() => false);
    expect(hasTranscripts || isEmpty).toBe(true);
  });

  test("upload new button links to analyze page", async ({ page }) => {
    await page.goto("/transcripts");
    await page.waitForLoadState("networkidle");

    const uploadLink = page.getByRole("link", { name: /Upload New|Go to Analyze/ });
    await expect(uploadLink.first()).toBeVisible();
  });

  test("upload and view transcript", async ({ page }) => {
    // Upload via Analyze page
    await page.goto("/analyze");
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: "Upload File" }).click();
    const buffer = Buffer.from(SAMPLE_TRANSCRIPT);
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: `e2e-view-test-${Date.now()}.md`,
      mimeType: "text/markdown",
      buffer,
    });
    await expect(page.getByText("Transcript uploaded!")).toBeVisible({
      timeout: 10_000,
    });

    // Go to Transcripts page
    await page.getByRole("link", { name: "Transcripts" }).click();
    await page.waitForLoadState("networkidle");

    // Should see the transcript
    await expect(page.getByText(/e2e-view-test/).first()).toBeVisible({ timeout: 5_000 });

    // Click View
    await page.getByRole("button", { name: "View" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Sales Call Transcript")).toBeVisible({ timeout: 5_000 });
  });

  test("search filters transcripts", async ({ page }) => {
    // Upload a transcript with unique name
    await page.goto("/analyze");
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: "Upload File" }).click();
    const uniqueName = `searchable-${Date.now()}`;
    const buffer = Buffer.from(SAMPLE_TRANSCRIPT);
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: `${uniqueName}.md`,
      mimeType: "text/markdown",
      buffer,
    });
    await expect(page.getByText("Transcript uploaded!")).toBeVisible({
      timeout: 10_000,
    });

    // Navigate to Transcripts
    await page.getByRole("link", { name: "Transcripts" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 5_000 });

    // Search with non-matching term
    const searchInput = page.getByPlaceholder("Search by filename or consultant");
    await searchInput.fill("zzz_no_match_zzz");
    await expect(page.getByText(uniqueName)).not.toBeVisible();

    // Clear and verify it reappears
    await searchInput.fill("");
    await expect(page.getByText(uniqueName)).toBeVisible();
  });
});
