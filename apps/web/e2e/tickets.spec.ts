import { test, expect } from '@playwright/test';

test('tickets page smoke test', async ({ page }) => {
  await page.goto('/tickets');

  // Assert booking reference input is visible
  const bookingRefInput = page.locator('input#booking-ref-input');
  await expect(bookingRefInput).toBeVisible();

  // Assert lookup button is visible
  const lookupButton = page.locator('button[type="submit"]:has-text("Lookup")');
  await expect(lookupButton).toBeVisible();

  // Assert recovery mode switch is visible
  const recoverySwitch = page.locator('button:has-text("Forgot your booking reference?")');
  await expect(recoverySwitch).toBeVisible();
});
