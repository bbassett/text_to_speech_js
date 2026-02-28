import { test, expect } from "@playwright/test";
import { mockTtsStreamError, mockUrlToTextError } from "../fixtures/mock-api";

test.describe("error handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows error on TTS API failure", async ({ page }) => {
    await mockTtsStreamError(page, "Server error occurred");
    await page.locator("#text-input").fill("Hello world");

    await page
      .getByRole("button", { name: "Convert to Speech" })
      .click();

    await expect(page.getByText("Server error occurred")).toBeVisible({
      timeout: 10000,
    });
  });

  test("shows error on URL extraction failure", async ({ page }) => {
    await mockUrlToTextError(page, "Could not extract text from URL");
    await page.locator("#url-input").fill("https://example.com");

    // URL auto-extraction triggers after debounce
    await expect(
      page.getByText("Could not extract text from URL")
    ).toBeVisible({ timeout: 10000 });
  });

  test("audio section hidden when error occurs", async ({ page }) => {
    await mockTtsStreamError(page);
    await page.locator("#text-input").fill("Hello world");

    await page
      .getByRole("button", { name: "Convert to Speech" })
      .click();

    await expect(page.getByText("Mock TTS error")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("audio")).toBeHidden();
  });
});
