import {
  test as base,
  chromium,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import path from "path";

const EXTENSION_PATH = path.resolve(__dirname, "../../dist/chrome-test");

type ExtensionFixtures = {
  context: BrowserContext;
  extensionPage: Page;
};

export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        "--no-first-run",
      ],
    });
    await use(context);
    await context.close();
  },
  extensionPage: async ({ context }, use) => {
    let sw = context.serviceWorkers()[0];
    if (!sw) {
      sw = await context.waitForEvent("serviceworker");
    }

    const page = await context.newPage();
    await page.goto("http://localhost:3000/test-article.html");

    // Trigger content script injection via the service worker
    await sw.evaluate(async (pageUrl: string) => {
      const tabs = await chrome.tabs.query({ url: pageUrl });
      const tab = tabs[0];
      if (!tab?.id) throw new Error("Tab not found");
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["lib/readability.js", "content/content.js"],
      });
    }, "http://localhost:3000/test-article.html");

    await page.waitForSelector("#__tts-extension-host", { timeout: 10000 });

    await use(page);
  },
});

export { expect } from "@playwright/test";
