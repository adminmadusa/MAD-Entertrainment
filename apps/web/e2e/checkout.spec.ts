import { test, expect } from '@playwright/test';

test.describe('Checkout Flow Smoke Tests', () => {
  let bookingStatus = 'pending';

  test.beforeEach(async ({ page }) => {
    // Reset booking status before each test run
    bookingStatus = 'pending';

    // Mock auth/me to return unauthenticated state so guest fields render
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
    });

    // Mock GET /api/bookings/booking-123
    await page.route('**/api/bookings/booking-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            booking: {
              _id: 'booking-123',
              bookingId: 'MAD-2026-TEST',
              status: bookingStatus,
              subtotal: 3000,
              convenienceFee: 100,
              gst: 540,
              discount: 0,
              totalAmount: 3640,
              currency: 'INR',
              mode: 'online',
              guestEmail: bookingStatus === 'confirmed' ? 'john.doe@example.com' : '',
              guestPhone: bookingStatus === 'confirmed' ? '9876543210' : '',
              firstName: bookingStatus === 'confirmed' ? 'John' : '',
              lastName: bookingStatus === 'confirmed' ? 'Doe' : '',
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 600000).toISOString(), // 10 minutes in the future
              logicalExpiresAt: new Date(Date.now() + 600000).toISOString(),
              eventId: {
                _id: 'event-123',
                title: 'Summer Solstice 2026',
                startDate: '2026-07-15T18:00:00Z',
                showTime: '18:00',
                bannerImage: {
                  url: 'https://example.com/banner.jpg',
                },
              },
            },
            tickets: [{ tierName: 'VIP Pass', quantity: 2, price: 1500 }],
            ticketsReady: bookingStatus === 'confirmed',
          },
        }),
      });
    });

    // Mock PUT /api/bookings/booking-123/checkout-details
    await page.route('**/api/bookings/booking-123/checkout-details', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            booking: {
              _id: 'booking-123',
              bookingId: 'MAD-2026-TEST',
              status: 'pending',
              subtotal: 3000,
              convenienceFee: 100,
              gst: 540,
              discount: 0,
              totalAmount: 3640,
              currency: 'INR',
              mode: 'online',
              guestEmail: 'john.doe@example.com',
              guestPhone: '9876543210',
              firstName: 'John',
              lastName: 'Doe',
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 600000).toISOString(),
              logicalExpiresAt: new Date(Date.now() + 600000).toISOString(),
              eventId: {
                _id: 'event-123',
                title: 'Summer Solstice 2026',
                startDate: '2026-07-15T18:00:00Z',
                showTime: '18:00',
              },
            },
          },
        }),
      });
    });

    // Mock POST /api/payments/create-intent
    await page.route('**/api/payments/create-intent', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            gateway: 'razorpay',
            orderId: 'order_123',
            amount: 364000,
            currency: 'INR',
            bookingId: 'booking-123',
            isMock: true,
          },
        }),
      });
    });
  });

  test('Checkout page load, form rendering, and order summary validation', async ({ page }) => {
    // 1. Checkout Page Load
    await page.goto('/checkout/booking-123');

    await expect(page.locator('h1#checkout-modal-title:has-text("Checkout")')).toBeVisible();
    await expect(page.locator('h2:has-text("Summer Solstice 2026")')).toBeVisible();

    // 2. Guest Information Form fields rendering
    const firstNameInput = page.locator('#checkout-first-name');
    const lastNameInput = page.locator('#checkout-last-name');
    const emailInput = page.locator('#checkout-email');
    const emailConfirmInput = page.locator('#checkout-email-confirm');
    const phoneInput = page.locator('#checkout-phone');

    await expect(firstNameInput).toBeVisible();
    await expect(lastNameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(emailConfirmInput).toBeVisible();
    await expect(phoneInput).toBeVisible();

    // Required field validation check
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Last name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();

    // 3. Order Summary verification
    await expect(page.locator('text=Subtotal')).toBeVisible();
    await expect(page.locator('text=₹3000').first()).toBeVisible();
    await expect(page.locator('text=Convenience Fee')).toBeVisible();
    await expect(page.locator('text=₹100').first()).toBeVisible();
    await expect(page.locator('text=GST (18%)')).toBeVisible();
    await expect(page.locator('text=₹540').first()).toBeVisible();
    await expect(page.locator('text=₹3640').first()).toBeVisible();

    // 4. Terms & Controls verification
    await expect(submitBtn).toBeVisible();
    await expect(page.locator('text=By completing your booking, you agree to our Terms of Service and Privacy Policy.')).toBeVisible();
  });

  test('Successful checkout payment and redirect handling', async ({ page }) => {
    // Mock successful payment verification
    await page.route('**/api/payments/verify', async (route) => {
      bookingStatus = 'confirmed';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            _id: 'booking-123',
            bookingId: 'MAD-2026-TEST',
            status: 'confirmed',
          },
        }),
      });
    });

    await page.goto('/checkout/booking-123');

    // Fill form details
    await page.locator('#checkout-first-name').fill('John');
    await page.locator('#checkout-last-name').fill('Doe');
    await page.locator('#checkout-email').fill('john.doe@example.com');
    await page.locator('#checkout-email-confirm').fill('john.doe@example.com');
    await page.locator('#checkout-phone').fill('9876543210');

    // 5. Payment Initialization
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // 6. Booking Confirmation screen
    await expect(page.locator('h2:has-text("Booking Confirmed!")')).toBeVisible();
    await expect(page.locator('text=MAD-2026-TEST').first()).toBeVisible();
    await expect(page.locator('text=john.doe@example.com').first()).toBeVisible();

    // 7. Redirect Handling (Wait for Auto-redirect countdown text to be visible)
    await expect(page.locator('text=Auto-redirecting to your Ticket Wallet in')).toBeVisible();
  });

  test('Failed checkout payment handling', async ({ page }) => {
    // Mock failed payment verification
    await page.route('**/api/payments/verify', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Payment verification failed: Invalid Signature',
        }),
      });
    });

    await page.goto('/checkout/booking-123');

    // Fill form details
    await page.locator('#checkout-first-name').fill('John');
    await page.locator('#checkout-last-name').fill('Doe');
    await page.locator('#checkout-email').fill('john.doe@example.com');
    await page.locator('#checkout-email-confirm').fill('john.doe@example.com');
    await page.locator('#checkout-phone').fill('9876543210');

    // Submit form
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // 8. Failure Handling: verify error banner and that user remains on checkout page
    await expect(page.locator('text=Payment verification failed: Invalid Signature')).toBeVisible();
    await expect(page.locator('h1#checkout-modal-title:has-text("Checkout")')).toBeVisible();
    await expect(page.locator('h2:has-text("Booking Confirmed!")')).not.toBeVisible();
  });
});
