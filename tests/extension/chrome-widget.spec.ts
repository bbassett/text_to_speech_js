import { test, expect } from "./fixtures";

test.describe("chrome extension widget", () => {
  test("shadow host is injected into page", async ({ extensionPage: page }) => {
    await expect(page.locator("#__tts-extension-host")).toBeAttached();
  });

  test("panel is visible", async ({ extensionPage: page }) => {
    const panel = page.locator("#__tts-extension-host >>.tts-panel");
    await expect(panel).toBeVisible();
  });

  test("voice selector exists with options", async ({
    extensionPage: page,
  }) => {
    const voice = page.locator("#__tts-extension-host >>#tts-voice");
    await expect(voice).toBeVisible();
    await expect(voice).toHaveValue("en-US-Wavenet-D");
  });

  test("generate button exists", async ({ extensionPage: page }) => {
    const btn = page.locator("#__tts-extension-host >>#tts-generate");
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText("Generate Speech");
  });

  test("speed buttons exist", async ({ extensionPage: page }) => {
    const host = page.locator("#__tts-extension-host");
    await expect(host.locator(".tts-speed-btn").first()).toBeAttached();
    const count = await host.locator(".tts-speed-btn").count();
    expect(count).toBe(3);
  });

  test("paste toggle exists", async ({ extensionPage: page }) => {
    const toggle = page.locator("#__tts-extension-host >>#tts-paste-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText("Paste text instead");
  });

  test("paste toggle shows textarea and hides preview", async ({
    extensionPage: page,
  }) => {
    const host = page.locator("#__tts-extension-host");
    await host.locator("#tts-paste-toggle").click();

    await expect(host.locator("#tts-paste-area")).toBeVisible();
    await expect(host.locator("#tts-text-preview")).toBeHidden();
  });

  test("minimize hides the panel", async ({ extensionPage: page }) => {
    const host = page.locator("#__tts-extension-host");
    await host.locator("#tts-minimize").click();

    await expect(host.locator(".tts-panel")).toBeHidden();
  });

  test("close removes the widget", async ({ extensionPage: page }) => {
    const host = page.locator("#__tts-extension-host");
    await host.locator("#tts-close").click();

    await expect(page.locator("#__tts-extension-host")).not.toBeAttached();
  });
});
