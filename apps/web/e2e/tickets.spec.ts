import { test, expect } from '@playwright/test';

test('tickets page smoke test', async ({ page }) => {
  await page.goto('/tickets');

  // Assert booking reference input is visible
  const bookingRefInput = page.locator('input#bookingRef');
  await expect(bookingRefInput).toBeVisible();

  // Assert lookup button is visible
  const lookupButton = page.locator('button[type="submit"]:has-text("Find Tickets")');
  await expect(lookupButton).toBeVisible();

  // Assert recovery mode switch is visible
  const supportLink = page.locator('button:has-text("Having issues? Contact Support")');
  await expect(supportLink).toBeVisible();
});
