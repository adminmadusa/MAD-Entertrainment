import { test, expect } from '@playwright/test';

// Set up API and localStorage mocks before each test
test.beforeEach(async ({ page }) => {
  // Inject mock token into localStorage before page hydration
  await page.addInitScript(() => {
    window.localStorage.setItem('mad_admin_token', 'mock-admin-token');
  });

  // Mock /admin/auth/me response
  await page.route('**/api/admin/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'admin-123',
          name: 'Super Admin',
          email: 'admin@madusa.com',
          role: 'super_admin',
        },
      }),
    });
  });

  // Mock /admin/events response (dropdown filters)
  await page.route('**/api/admin/events?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          events: [
            {
              _id: 'event-123',
              title: 'Summer Solstice 2026',
              slug: 'summer-solstice-2026',
              description: 'Summer party',
              category: 'festival',
              mode: 'live',
              status: 'published',
              venue: 'Main Arena',
              startDate: '2026-07-15T18:00:00Z',
              totalCapacity: 500,
              createdAt: '2026-06-01T12:00:00Z',
              ticketTiers: [],
            },
          ],
          pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
        },
      }),
    });
  });

  // Mock /admin/bookings/summary response (metrics widget)
  await page.route('**/api/admin/bookings/summary*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          totalBookings: 1,
          totalTickets: 2,
          revenue: 3000,
          confirmed: 1,
          pending: 0,
          cancelled: 0,
          checkedIn: 1,
        },
      }),
    });
  });

  // Mock /admin/bookings list response
  await page.route('**/api/admin/bookings?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            _id: 'booking-123',
            bookingId: 'MAD-2026-TEST',
            status: 'confirmed',
            totalAmount: 3000,
            currency: 'INR',
            mode: 'online',
            createdAt: '2026-06-07T12:00:00Z',
            eventId: {
              _id: 'event-123',
              title: 'Summer Solstice 2026',
              startDate: '2026-07-15T18:00:00Z',
            },
            guestInfo: {
              name: 'John Doe',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              phone: '9876543210',
              keepUpdated: true,
              sendBestEvents: false,
            },
            tickets: [{ tierName: 'VIP Pass', quantity: 2, price: 1500 }],
            totalTickets: 2,
            ticketsScanned: 1,
            ticketsRemaining: 1,
            attendanceStatus: 'PARTIALLY_ATTENDED',
            auditHistory: [],
            individualTickets: [],
          },
        ],
        pagination: { page: 1, limit: 15, total: 1, totalPages: 1 },
      }),
    });
  });
});

test('bookings page renders correct components, widgets, and rows', async ({ page }) => {
  // Navigate to admin bookings page
  await page.goto('/bookings');

  // Verify bookings page renders (use a class or hierarchy to avoid matching sidebar/header h1)
  await expect(page.locator('main h1:has-text("Bookings")')).toBeVisible();
  await expect(page.locator('input[placeholder="Search by reference or email..."]')).toBeVisible();

  // Verify summary widgets render using first() to avoid potential duplicate text matches
  await expect(page.locator('p:text("Total Revenue")').first()).toBeVisible();
  await expect(page.locator('p:text("₹3,000")').first()).toBeVisible();
  await expect(page.locator('p:text("Total Bookings")').first()).toBeVisible();
  await expect(page.locator('p:text("Total Tickets")').first()).toBeVisible();
  await expect(page.locator('p:text("Checked In")').first()).toBeVisible();
  await expect(page.locator('span:text("50%")').first()).toBeVisible(); // 1 checked in of 2 total tickets = 50%

  // Verify booking row renders
  const bookingRow = page.locator('tr:has-text("MAD-2026-TEST")');
  await expect(bookingRow).toBeVisible();
  await expect(bookingRow.locator('text=John Doe')).toBeVisible();
  await expect(bookingRow.locator('text=john.doe@example.com')).toBeVisible();
  await expect(bookingRow.locator('text=Summer Solstice 2026')).toBeVisible();
  await expect(bookingRow.locator('text=₹3,000')).toBeVisible();
  await expect(bookingRow.locator('text=Confirmed')).toBeVisible();
});

test('booking detail modal and email correction modal interactions', async ({ page }) => {
  // Navigate to admin bookings page
  await page.goto('/bookings');

  // Click on the booking row to open detail modal
  const bookingRow = page.locator('tr:has-text("MAD-2026-TEST")');
  await bookingRow.click();

  // Verify booking detail modal opens and shows fields
  const detailModal = page.locator('div.fixed.inset-0.bg-black\\/60');
  await expect(detailModal).toBeVisible();
  await expect(detailModal.locator('h3:text("MAD-2026-TEST")')).toBeVisible();
  await expect(detailModal.locator('text=Customer Info')).toBeVisible();

  // Use first() to avoid strict mode violations on duplicated email strings
  await expect(detailModal.locator('text=john.doe@example.com').first()).toBeVisible();
  await expect(detailModal.locator('text=9876543210')).toBeVisible();
  await expect(detailModal.locator('text=Summer Solstice 2026')).toBeVisible();
  await expect(detailModal.locator('text=VIP Pass')).toBeVisible();

  // Verify "Edit Email" button exists and click it
  const editEmailBtn = detailModal.locator('button:has-text("Edit Email")');
  await expect(editEmailBtn).toBeVisible();
  await editEmailBtn.click();

  // Verify email correction modal opens
  const correctionModal = page.locator('div.fixed.inset-0.bg-black\\/60').nth(1); // Second overlay/modal layer
  await expect(correctionModal).toBeVisible();
  await expect(correctionModal.locator('h3:text("Correct Booking Email")')).toBeVisible();
  await expect(correctionModal.locator('input[type="email"]')).toBeVisible();
  await expect(correctionModal.locator('textarea')).toBeVisible();

  // Close the email correction modal
  await correctionModal.locator('button:has-text("Cancel")').click();
  await expect(correctionModal).not.toBeVisible();

  // Close the booking detail modal
  await detailModal.locator('button:has-text("Close")').click();
  await expect(detailModal).not.toBeVisible();
});
