import { test, expect } from "@playwright/test";
import {
  mockTtsStream,
  mockTtsStreamSlow,
  mockUrlToText,
  mockUrlToTextSlow,
} from "../fixtures/mock-api";

test.describe("convert button", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("disabled when both inputs are empty", async ({ page }) => {
    const button = page.getByRole("button", { name: /Convert to Speech/ });
    await expect(button).toBeDisabled();
  });

  test("enabled when text input has content", async ({ page }) => {
    await page.locator("#text-input").fill("Hello world");
    const button = page.getByRole("button", { name: /Convert to Speech/ });
    await expect(button).toBeEnabled();
  });

  test("enabled when url input has content", async ({ page }) => {
    await page.locator("#url-input").fill("https://example.com");
    const button = page.getByRole("button", {
      name: /Extract & Convert to Speech/,
    });
    await expect(button).toBeEnabled();
  });

  test("shows 'Convert to Speech' with text input", async ({ page }) => {
    await page.locator("#text-input").fill("Hello world");
    const button = page.getByRole("button", { name: "Convert to Speech" });
    await expect(button).toBeVisible();
  });

  test("shows 'Extract & Convert' with url input only", async ({ page }) => {
    await page.locator("#url-input").fill("https://example.com");
    const button = page.getByRole("button", {
      name: "Extract & Convert to Speech",
    });
    await expect(button).toBeVisible();
  });

  test("shows 'Generating Speech...' during TTS", async ({ page }) => {
    await mockTtsStreamSlow(page, 5000);
    await page.locator("#text-input").fill("Hello world");

    const button = page.getByRole("button", { name: "Convert to Speech" });
    await button.click();

    await expect(
      page.getByRole("button", { name: "Generating Speech..." })
    ).toBeVisible();
  });

  test("shows 'Extracting Text...' during URL extraction", async ({
    page,
  }) => {
    await mockUrlToTextSlow(page, 5000);
    await page.locator("#url-input").fill("https://example.com");

    // Wait for debounce to trigger auto-extract
    await expect(
      page.getByRole("button", { name: "Extracting Text..." })
    ).toBeVisible({ timeout: 3000 });
  });

  test("audio section appears after successful TTS", async ({ page }) => {
    await mockTtsStream(page);
    await page.locator("#text-input").fill("Hello world");

    const button = page.getByRole("button", { name: "Convert to Speech" });
    await button.click();

    await expect(page.locator("audio")).toBeVisible({ timeout: 10000 });
  });
});
