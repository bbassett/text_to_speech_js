import { test, expect } from "@playwright/test";

test.describe("page load", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has title", async ({ page }) => {
    await expect(page).toHaveTitle(/Create Next App/);
  });

  test("url input is visible and enabled", async ({ page }) => {
    const urlInput = page.locator("#url-input");
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toBeEnabled();
  });

  test("text input is visible and enabled", async ({ page }) => {
    const textInput = page.locator("#text-input");
    await expect(textInput).toBeVisible();
    await expect(textInput).toBeEnabled();
  });

  test("voice selector has default value", async ({ page }) => {
    const voiceSelect = page.locator("#voice-select");
    await expect(voiceSelect).toBeVisible();
    await expect(voiceSelect).toHaveValue("en-US-Wavenet-D");
  });

  test("convert button is visible and disabled with no input", async ({
    page,
  }) => {
    const button = page.getByRole("button", { name: /Convert to Speech/ });
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
  });

  test("audio section is hidden", async ({ page }) => {
    const audioSection = page.locator("audio");
    await expect(audioSection).toBeHidden();
  });
});
