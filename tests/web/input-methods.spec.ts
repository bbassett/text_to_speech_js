import { test, expect } from "@playwright/test";

test.describe("input methods", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("typing text disables url input", async ({ page }) => {
    const textInput = page.locator("#text-input");
    const urlInput = page.locator("#url-input");

    await textInput.fill("Hello world");
    await expect(urlInput).toBeDisabled();
  });

  test("typing url disables text input", async ({ page }) => {
    const textInput = page.locator("#text-input");
    const urlInput = page.locator("#url-input");

    await urlInput.fill("https://example.com");
    await expect(textInput).toBeDisabled();
  });

  test("clearing text re-enables url input", async ({ page }) => {
    const textInput = page.locator("#text-input");
    const urlInput = page.locator("#url-input");

    await textInput.fill("Hello world");
    await expect(urlInput).toBeDisabled();

    // Click the Clear button next to text input
    const clearButtons = page.getByRole("button", { name: "Clear" });
    await clearButtons.last().click();

    await expect(urlInput).toBeEnabled();
  });

  test("clearing url re-enables text input", async ({ page }) => {
    const textInput = page.locator("#text-input");
    const urlInput = page.locator("#url-input");

    await urlInput.fill("https://example.com");
    await expect(textInput).toBeDisabled();

    const clearButtons = page.getByRole("button", { name: "Clear" });
    await clearButtons.first().click();

    await expect(textInput).toBeEnabled();
  });
});
