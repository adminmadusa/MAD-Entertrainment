import { test, expect } from '@playwright/test';

test('events page smoke test', async ({ page }) => {
  await page.goto('/events');

  // Assert main#main-content is visible
  const mainContent = page.locator('main#main-content');
  await expect(mainContent).toBeVisible();

  // Assert search input is visible
  const searchInput = page.locator('input[placeholder="Search events..."]');
  await expect(searchInput).toBeVisible();
});
