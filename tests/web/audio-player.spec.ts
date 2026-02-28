import { test, expect } from "@playwright/test";
import { mockTtsStream } from "../fixtures/mock-api";

test.describe("audio player", () => {
  test.beforeEach(async ({ page }) => {
    await mockTtsStream(page);
    await page.goto("/");
    await page.locator("#text-input").fill("Hello world");
    await page.getByRole("button", { name: "Convert to Speech" }).click();
    await expect(page.locator("audio")).toBeVisible({ timeout: 10000 });
  });

  test("speed buttons toggle active state", async ({ page }) => {
    const btn15x = page.getByRole("button", { name: "1.5x" });
    await btn15x.click();
    await expect(btn15x).toHaveClass(/bg-blue-600/);

    const btn1x = page.getByRole("button", { name: "1x" });
    await expect(btn1x).not.toHaveClass(/bg-blue-600/);
  });

  test("speed persists via cookie on reload", async ({ page }) => {
    await page.getByRole("button", { name: "2x" }).click();

    // Re-trigger audio so buttons are visible after reload
    await mockTtsStream(page);
    await page.reload();
    await page.locator("#text-input").fill("Hello again");
    await page.getByRole("button", { name: "Convert to Speech" }).click();
    await expect(page.locator("audio")).toBeVisible({ timeout: 10000 });

    const btn2x = page.getByRole("button", { name: "2x" });
    await expect(btn2x).toHaveClass(/bg-blue-600/);
  });

  test("skip buttons exist", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Back 15 seconds" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Forward 15 seconds" })
    ).toBeVisible();
  });

  test("download button is visible", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Download Audio" })
    ).toBeVisible();
  });
});
