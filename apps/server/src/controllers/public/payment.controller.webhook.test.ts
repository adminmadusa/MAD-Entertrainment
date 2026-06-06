/**
 * Payment Controller — Webhook Integrity Guards Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { razorpayWebhook, stripeWebhook } from './payment.controller';
import { WebhookEvent } from '../../models/webhook-event.schema';
import { PaymentService } from '../../services/public/payment.service';
import { getStripe } from '../../config/stripe';

// ─── Module mocks ─────────────────────────────────────────────

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
    RAZORPAY_KEY_ID: 'rzp_test_key',
    RAZORPAY_KEY_SECRET: 'rzp_test_secret',
  })),
}));

vi.mock('../../config/stripe', () => ({
  getStripe: vi.fn(() => ({
    webhooks: {
      constructEvent: vi.fn(),
    },
  })),
}));

vi.mock('../../models/webhook-event.schema', () => ({
  WebhookEvent: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../services/public/payment.service', () => ({
  PaymentService: {
    confirmFromWebhook: vi.fn(),
    verifyPayment: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────

const WEBHOOK_SECRET = 'test_webhook_secret';

/** Build a valid HMAC-SHA256 signature for a given raw body. */
function razorpaySignature(rawBody: string): string {
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
}

/** Derive the body-bound idempotency key the same way the handler does. */
function expectedEventId(rawBody: string): string {
  return (
    'razorpay:' +
    crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex')
  );
}

const VALID_RAZORPAY_BODY = JSON.stringify({
  event: 'payment.captured',
  created_at: 1700000000,
  payload: {
    payment: {
      entity: {
        id: 'pay_TestPayId123',
        order_id: 'order_TestOrderId123',
      },
    },
  },
});

function makeRazorpayRequest(rawBody: string, overrideSignature?: string) {
  const sig = overrideSignature ?? razorpaySignature(rawBody);
  return {
    headers: {
      'x-razorpay-signature': sig,
      // Intentionally also send a spoofable event-id header to confirm it is NOT used
      'x-razorpay-event-id': 'spoofed-attacker-event-id',
    },
    rawBody: Buffer.from(rawBody),
  } as any;
}

function makeResponse() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

function makeWebhookEventDoc(status = 'success') {
  return {
    status,
    save: vi.fn(),
  };
}

// ─── Tests ────────────────────────────────────────────────────

describe('razorpayWebhook — replay protection hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects the request when the HMAC signature is invalid', async () => {
    const req = makeRazorpayRequest(VALID_RAZORPAY_BODY, 'bad-signature');
    const res = makeResponse();

    await razorpayWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Invalid signature');
    expect(WebhookEvent.findOne).not.toHaveBeenCalled();
  });

  it('processes a first delivery by persisting the body-derived eventId', async () => {
    const req = makeRazorpayRequest(VALID_RAZORPAY_BODY);
    const res = makeResponse();

    const mockDoc = {
      status: 'received',
      bookingId: undefined,
      processedAt: undefined,
      errorMessage: undefined,
      save: vi.fn(),
    };

    vi.mocked(WebhookEvent.findOne).mockResolvedValue(null); // No existing record
    vi.mocked(WebhookEvent.create).mockResolvedValue(mockDoc as any);
    vi.mocked(PaymentService.confirmFromWebhook).mockResolvedValue({
      status: 'confirmed',
      bookingId: 'booking-abc',
    });

    await razorpayWebhook(req, res);

    // Verify deduplication key is the body-derived fingerprint, NOT the spoofed header
    expect(WebhookEvent.findOne).toHaveBeenCalledWith({
      eventId: expectedEventId(VALID_RAZORPAY_BODY),
    });
    expect(WebhookEvent.findOne).not.toHaveBeenCalledWith({
      eventId: 'spoofed-attacker-event-id',
    });

    // Verify the persisted eventId matches the body fingerprint
    expect(WebhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: expectedEventId(VALID_RAZORPAY_BODY),
        provider: 'razorpay',
        eventType: 'payment.captured',
      })
    );

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 200 on second delivery (duplicate) without calling confirmFromWebhook', async () => {
    const req = makeRazorpayRequest(VALID_RAZORPAY_BODY);
    const res = makeResponse();

    const existingDoc = makeWebhookEventDoc('success');
    vi.mocked(WebhookEvent.findOne).mockResolvedValue(existingDoc as any);

    await razorpayWebhook(req, res);

    // Replay was correctly detected
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true, status: 'already_processed' });

    // Payment processing must NOT be triggered
    expect(PaymentService.confirmFromWebhook).not.toHaveBeenCalled();
    expect(WebhookEvent.create).not.toHaveBeenCalled();
  });

  it('rejects a header-spoofed replay: same body, different event-id header, still detected as duplicate', async () => {
    const spoofedHeaderReq = {
      headers: {
        'x-razorpay-signature': razorpaySignature(VALID_RAZORPAY_BODY),
        // Attacker changes the header to a fresh ID hoping to bypass deduplication
        'x-razorpay-event-id': 'fresh-attacker-event-id-different-from-db',
      },
      rawBody: Buffer.from(VALID_RAZORPAY_BODY),
    } as any;
    const res = makeResponse();

    // The DB contains the original body-derived fingerprint
    const existingDoc = makeWebhookEventDoc('success');
    vi.mocked(WebhookEvent.findOne).mockResolvedValue(existingDoc as any);

    await razorpayWebhook(spoofedHeaderReq, res);

    // Despite the different header value, the body fingerprint matches -> duplicate detected
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true, status: 'already_processed' });
    expect(PaymentService.confirmFromWebhook).not.toHaveBeenCalled();
  });

  it('a replay with a modified body fails signature validation before deduplication', async () => {
    // Attacker changes the payload to try to sneak in a different payment
    const modifiedBody = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_AttackerPayId',
            order_id: 'order_AttackerOrderId',
          },
        },
      },
    });

    // They still use the original signature (from a legitimate previous capture)
    const originalSignature = razorpaySignature(VALID_RAZORPAY_BODY);
    const req = makeRazorpayRequest(modifiedBody, originalSignature);
    const res = makeResponse();

    await razorpayWebhook(req, res);

    // Modified body != original body -> HMAC mismatch -> 400
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Invalid signature');
    expect(WebhookEvent.findOne).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// Audit trail preservation tests
// ─────────────────────────────────────────────────────────────

describe('razorpayWebhook — audit trail preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT call save() on the existing document when a duplicate is received', async () => {
    const req = makeRazorpayRequest(VALID_RAZORPAY_BODY);
    const res = makeResponse();

    const existingDoc = makeWebhookEventDoc('success');
    vi.mocked(WebhookEvent.findOne).mockResolvedValue(existingDoc as any);

    await razorpayWebhook(req, res);

    // The document must be read-only; save() must never be called
    expect(existingDoc.save).not.toHaveBeenCalled();
  });

  it('preserves the original status of a success record after duplicate delivery', async () => {
    const req = makeRazorpayRequest(VALID_RAZORPAY_BODY);
    const res = makeResponse();

    const existingDoc = makeWebhookEventDoc('success');
    vi.mocked(WebhookEvent.findOne).mockResolvedValue(existingDoc as any);

    await razorpayWebhook(req, res);

    // Status must remain 'success', not 'ignored'
    expect(existingDoc.status).toBe('success');
  });

  it('preserves the original status of a failed record after duplicate delivery', async () => {
    const req = makeRazorpayRequest(VALID_RAZORPAY_BODY);
    const res = makeResponse();

    const existingDoc = makeWebhookEventDoc('failed');
    vi.mocked(WebhookEvent.findOne).mockResolvedValue(existingDoc as any);

    await razorpayWebhook(req, res);

    expect(existingDoc.status).toBe('failed');
    expect(existingDoc.save).not.toHaveBeenCalled();
  });

  it('still returns HTTP 200 for duplicate even when original was a failed record', async () => {
    const req = makeRazorpayRequest(VALID_RAZORPAY_BODY);
    const res = makeResponse();

    vi.mocked(WebhookEvent.findOne).mockResolvedValue(makeWebhookEventDoc('failed') as any);

    await razorpayWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true, status: 'already_processed' });
  });
});

// ─────────────────────────────────────────────────────────────
// Stripe audit trail preservation (parallel fix)
// ─────────────────────────────────────────────────────────────

describe('stripeWebhook — audit trail preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeStripeRequest(stripeEventId: string) {
    return {
      headers: { 'stripe-signature': 'sig_test' },
      rawBody: Buffer.from('{}'),
    } as any;
  }

  function mockStripeConstructEvent(id: string, type = 'payment_intent.succeeded') {
    vi.mocked(getStripe).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          id,
          type,
          created: 1700000000,
          data: { object: { metadata: {}, id: 'pi_test' } },
        }),
      },
    } as any);
  }

  it('does NOT call save() on the existing Stripe document when a duplicate is received', async () => {
    const eventId = 'evt_stripe_test_123';
    mockStripeConstructEvent(eventId);

    const req = makeStripeRequest(eventId);
    const res = makeResponse();

    const existingDoc = makeWebhookEventDoc('success');
    vi.mocked(WebhookEvent.findOne).mockResolvedValue(existingDoc as any);

    await stripeWebhook(req, res);

    expect(existingDoc.save).not.toHaveBeenCalled();
  });

  it('preserves the original status of a Stripe success record after duplicate delivery', async () => {
    const eventId = 'evt_stripe_test_456';
    mockStripeConstructEvent(eventId);
    
    const req = makeStripeRequest(eventId);
    const res = makeResponse();

    const existingDoc = makeWebhookEventDoc('success');
    vi.mocked(WebhookEvent.findOne).mockResolvedValue(existingDoc as any);

    await stripeWebhook(req, res);

    // Status must remain 'success', never overwritten to 'ignored'
    expect(existingDoc.status).toBe('success');
  });

  it('returns HTTP 200 for duplicate Stripe delivery', async () => {
    const eventId = 'evt_stripe_test_789';
    mockStripeConstructEvent(eventId);

    const req = makeStripeRequest(eventId);
    const res = makeResponse();

    vi.mocked(WebhookEvent.findOne).mockResolvedValue(makeWebhookEventDoc('success') as any);

    await stripeWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('Event already processed');
    expect(PaymentService.verifyPayment).not.toHaveBeenCalled();
  });
});

