import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Mock /api/events/summer-solstice-2026 API endpoint
  await page.route('**/api/events/summer-solstice-2026', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          _id: 'event-123',
          title: 'Summer Solstice 2026',
          slug: 'summer-solstice-2026',
          description: 'This is the full descriptive text of the Summer Solstice festival. We need to make it much longer so that it exceeds the 150 characters limit. It will now definitely exceed 150 characters and show the Read More button.',
          category: 'festival',
          mode: 'live',
          status: 'published',
          venue: 'Sun City Arena',
          startDate: '2026-07-15T18:00:00Z',
          showTime: '18:00',
          doorsOpenTime: '17:00',
          ageRestriction: 18,
          totalCapacity: 500,
          soldCount: 150,
          organizerName: 'MAD Entertrainment',
          isSoldOut: false,
          ticketTiers: [
            { tier: 'ga', name: 'General Admission', price: 1000, quantity: 400, soldCount: 120, discount: 0, isAvailable: true },
            { tier: 'vip', name: 'VIP Pass', price: 2500, quantity: 100, soldCount: 30, discount: 200, isAvailable: true }
          ]
        }
      })
    });
  });

  // Mock guest checkout session endpoint
  await page.route('**/api/bookings/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          sessionId: 'session-abc-123',
          token: 'token-xyz-789'
        }
      })
    });
  });
});

test('event detail page loads and shows dynamic elements', async ({ page }) => {
  await page.goto('/events/summer-solstice-2026');

  // Verify event detail page loads and event title is visible
  await expect(page.locator('h1:has-text("Summer Solstice 2026")')).toBeVisible();
  await expect(page.locator('span:text("🎵 festival")')).toBeVisible();
  await expect(page.locator('span:has-text("Sun City Arena")').first()).toBeVisible();

  // Verify pricing display (VIP price is 2500 - 200 = 2300)
  await expect(page.locator('text=₹1000 - ₹2300').first()).toBeVisible();
});

test('overview text expands and collapses inline', async ({ page }) => {
  await page.goto('/events/summer-solstice-2026');

  // Verify Overview expands inline
  const readMoreBtn = page.locator('button:has-text("Read more →")');
  await expect(readMoreBtn).toBeVisible();
  await readMoreBtn.click();

  await expect(page.locator('text=descriptive text of the Summer Solstice festival')).toBeVisible();
  const showLessBtn = page.locator('button:has-text("Show less ↑")');
  await expect(showLessBtn).toBeVisible();

  // Verify Overview collapses inline
  await showLessBtn.click();
  await expect(page.locator('button:has-text("Read more →")')).toBeVisible();
});

test('ticket selection modal opens and closes with tiers rendered', async ({ page }) => {
  await page.goto('/events/summer-solstice-2026');

  // Verify Ticket Selection Modal opens
  const getTicketsBtn = page.locator('button:has-text("Get tickets")').first();
  await expect(getTicketsBtn).toBeVisible();
  await getTicketsBtn.click();

  const bookingModal = page.locator('div[role="dialog"]');
  await expect(bookingModal).toBeVisible();
  await expect(bookingModal.locator('h3:text("Summer Solstice 2026")')).toBeVisible();

  // Verify ticket tiers render
  await expect(bookingModal.locator('text=General Admission')).toBeVisible();
  await expect(bookingModal.locator('text=VIP Pass')).toBeVisible();

  // Verify Ticket Selection Modal closes
  await bookingModal.locator('button[aria-label="Close ticket selection modal"]').click();
  await expect(bookingModal).not.toBeVisible();
});
