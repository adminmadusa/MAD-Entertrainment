import { test, expect } from '@playwright/test';

test('auth page smoke test', async ({ page }) => {
  await page.goto('/login');

  // Assert input#email is visible
  const emailInput = page.locator('input#email');
  await expect(emailInput).toBeVisible();

  // Assert submit button is visible
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeVisible();

  // Trigger invalid email validation (remove required to trigger react state validation)
  await page.evaluate(() => {
    document.getElementById('email')?.removeAttribute('required');
  });
  await submitButton.click();

  // Assert validation error appears
  const errorContainer = page.locator('div.text-red-400');
  await expect(errorContainer).toBeVisible();
  await expect(errorContainer).toContainText('Email address is required');
});
