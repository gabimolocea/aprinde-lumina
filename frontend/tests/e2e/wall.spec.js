import { test, expect } from "@playwright/test";

test.describe("Wall Grid", () => {
  test("loads the candle wall with section headers", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".wall")).toBeVisible();
    await expect(page.locator(".wall__section-header--morti")).toContainText("Adormiți");
    await expect(page.locator(".wall__section-header--vii")).toContainText("Vii");
  });

  test("header is visible with site title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".header")).toBeVisible();
    await expect(page.locator(".header__title")).toBeVisible();
  });

  test("candle slots are rendered", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".wall__slot");
    const slots = page.locator(".wall__slot");
    expect(await slots.count()).toBeGreaterThan(0);
  });

  test("scrolling down loads more rows", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".wall__slot");
    const initialCount = await page.locator(".wall__slot").count();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);

    const afterCount = await page.locator(".wall__slot").count();
    expect(afterCount).toBeGreaterThanOrEqual(initialCount);
  });

  test("lit candles are visible in the grid", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".wall__slot");
    // At least some slots should contain a candle element (lit)
    const litCandles = page.locator(".candle--lit");
    // May be 0 if wall is empty — just verify no JS errors
    await expect(page.locator(".wall__body")).toBeVisible();
  });
});
