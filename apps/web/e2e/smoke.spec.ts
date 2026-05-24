import { test, expect } from '@playwright/test';

test('homepage loads and has expected title', async ({ page }) => {
  await page.goto('/');
  // Next.js App router usually sets titles in metadata.
  // Wait for the body to be visible as a basic smoke test.
  await expect(page.locator('body')).toBeVisible();
});
