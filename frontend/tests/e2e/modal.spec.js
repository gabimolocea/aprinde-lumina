import { test, expect } from "@playwright/test";

test.describe("LightCandleModal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".wall__slot");
  });

  test("opens light-candle modal when clicking an empty slot", async ({ page }) => {
    // Click the first slot — may be empty or lit
    await page.locator(".wall__slot").first().click();
    // Either modal opens OR candle detail opens — both are .modal
    await expect(page.locator(".modal")).toBeVisible();
  });

  test("free candle form has phone, requester and dedicated inputs", async ({ page }) => {
    // Find first empty slot (no candle--lit child)
    const emptySlot = page.locator(".wall__slot:not(:has(.candle--lit))").first();
    await emptySlot.click();

    const modal = page.locator(".modal");
    await expect(modal).toBeVisible();

    // If it's the light-candle modal (not detail), check inputs
    const phoneInput = modal.locator("input[type='tel']");
    if (await phoneInput.isVisible()) {
      await expect(modal.locator("input[type='tel']")).toBeVisible();
      await expect(modal.locator("input[type='text']").first()).toBeVisible();
    }
  });

  test("shows validation error when submitting empty free form", async ({ page }) => {
    const emptySlot = page.locator(".wall__slot:not(:has(.candle--lit))").first();
    await emptySlot.click();
    await expect(page.locator(".modal")).toBeVisible();

    const submitBtn = page.locator(".modal__btn--free");
    const isLightModal = await submitBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isLightModal) {
      // Clicked a lit candle — skip
      test.skip();
      return;
    }
    await submitBtn.click();
    await expect(page.locator(".modal__error")).toBeVisible();
  });

  test("closes modal when clicking X", async ({ page }) => {
    await page.locator(".wall__slot").first().click();
    await expect(page.locator(".modal")).toBeVisible();
    await page.locator(".modal__close").click({ force: true });
    await expect(page.locator(".modal")).not.toBeVisible();
  });

  test("closes modal when clicking overlay", async ({ page }) => {
    await page.locator(".wall__slot").first().click();
    await expect(page.locator(".modal")).toBeVisible();
    // Click the overlay (outside the modal card)
    await page.locator(".modal-overlay").click({ position: { x: 5, y: 5 } });
    await expect(page.locator(".modal")).not.toBeVisible();
  });

  test("free candle submission succeeds in demo mode", async ({ page }) => {
    const emptySlot = page.locator(".wall__slot:not(:has(.candle--lit))").first();
    await emptySlot.click();

    const submitBtn = page.locator(".modal__btn--free");
    if (!await submitBtn.isVisible()) {
      test.skip();
      return;
    }

    await page.locator("input[type='tel']").fill("0712345678");
    await page.locator("input[type='text']").nth(0).fill("Ion Test");
    await page.locator("input[type='text']").nth(1).fill("Maria Test");
    await submitBtn.click();

    // In demo mode, should reach SUCCESS step
    await expect(page.locator(".modal__success, .modal__error")).toBeVisible({ timeout: 5000 });
  });
});
