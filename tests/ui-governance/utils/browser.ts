import { Page } from '@playwright/test';

/**
 * Wait for network idle and layout stability (e.g. animations/fonts fully settled)
 */
export async function waitPageStability(page: Page, timeoutMs = 2500): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout: timeoutMs });
  } catch (e) {
    // Silent fallback if networkidle times out
  }
  // Wait short delay to allow animations to settle
  await page.waitForTimeout(250);
}
