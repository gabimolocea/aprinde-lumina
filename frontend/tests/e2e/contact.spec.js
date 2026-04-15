import { test, expect } from "@playwright/test";

test.describe("Contact Page", () => {
  test("loads at /contact", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator(".contact-page__title")).toContainText("Contactează-ne");
  });

  test("shows the contact form with all fields", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator(".contact-page__form")).toBeVisible();
    await expect(page.locator("input[type='text']").first()).toBeVisible(); // name
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("textarea")).toBeVisible();
  });

  test("back link navigates to wall", async ({ page }) => {
    await page.goto("/contact");
    await page.locator(".contact-page__back").click();
    await expect(page).toHaveURL("/");
    await expect(page.locator(".wall")).toBeVisible();
  });

  test("shows validation when submitting empty form", async ({ page }) => {
    await page.goto("/contact");
    await page.locator(".contact-page__btn[type='submit']").click();
    // HTML5 required validation or custom error
    const nameInput = page.locator("input[type='text']").first();
    await expect(nameInput).toBeFocused();
  });

  test("submits contact form successfully", async ({ page }) => {
    await page.goto("/contact");
    await page.locator("input[type='text']").first().fill("Test User");
    await page.locator("input[type='email']").fill("test@example.com");
    await page.locator("textarea").fill("Vreau sa plasez o reclama.");
    await page.locator(".contact-page__btn[type='submit']").click();
    // Expect success message
    await expect(page.locator(".contact-page__success")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Ad Placeholder", () => {
  test("contact link in ad placeholder points to /contact", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".wall__slot");
    const adLink = page.locator(".wall__ad-placeholder-link").first();
    if (await adLink.isVisible()) {
      await expect(adLink).toHaveAttribute("href", "/contact");
    }
  });
});
