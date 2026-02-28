import { Page } from "@playwright/test";

// Minimal valid MP3 frame (silent)
const SILENT_MP3 = Buffer.from(
  "//uQxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV",
  "base64"
);

export async function mockTtsStream(page: Page) {
  await page.route("**/api/tts-stream", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "audio/mpeg",
      body: SILENT_MP3,
    });
  });
}

export async function mockTtsStreamSlow(page: Page, delayMs = 2000) {
  await page.route("**/api/tts-stream", async (route) => {
    await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "audio/mpeg",
      body: SILENT_MP3,
    });
  });
}

export async function mockTtsStreamError(
  page: Page,
  message = "Mock TTS error"
) {
  await page.route("**/api/tts-stream", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: message }),
    });
  });
}

export async function mockUrlToText(
  page: Page,
  opts?: { text?: string; title?: string }
) {
  await page.route("**/api/url-to-text", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        text: opts?.text ?? "Extracted article text for testing purposes.",
        title: opts?.title ?? "Test Article",
        originalLength: (
          opts?.text ?? "Extracted article text for testing purposes."
        ).length,
        truncated: false,
      }),
    });
  });
}

export async function mockUrlToTextSlow(page: Page, delayMs = 2000) {
  await page.route("**/api/url-to-text", async (route) => {
    await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        text: "Extracted article text for testing purposes.",
        title: "Test Article",
        originalLength: 45,
        truncated: false,
      }),
    });
  });
}

export async function mockUrlToTextError(
  page: Page,
  message = "Could not extract text"
) {
  await page.route("**/api/url-to-text", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: message }),
    });
  });
}
