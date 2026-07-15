import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod with OpenAPI properties (like description, example, etc.)
extendZodWithOpenApi(z);

import {
  checkoutSchema,
  paymentVerificationSchema,
  adminDlqRetrySchema,
  addGalleryItemsSchema,
  updateGalleryItemSchema,
  setCoverImageSchema,
  updateGalleryVisibilitySchema,
  reorderGalleryItemsSchema,
  updateGallerySettingsSchema,
} from '@mad/validations';

export const registry = new OpenAPIRegistry();

// ─── Register Shared Schemas ─────────────────────────────────
const checkoutModel = registry.register('CheckoutInput', checkoutSchema);
const paymentVerificationModel = registry.register('PaymentVerificationInput', paymentVerificationSchema);
registry.register('AdminDlqRetryInput', adminDlqRetrySchema);
registry.register('AddGalleryItemsInput', addGalleryItemsSchema);
registry.register('UpdateGalleryItemInput', updateGalleryItemSchema);
registry.register('SetCoverImageInput', setCoverImageSchema);
registry.register('UpdateGalleryVisibilityInput', updateGalleryVisibilitySchema);
registry.register('ReorderGalleryItemsInput', reorderGalleryItemsSchema);
registry.register('UpdateGallerySettingsInput', updateGallerySettingsSchema);

// ─── Register REST API Routes ────────────────────────────────

// 1. Health Probe
registry.registerPath({
  method: 'get',
  path: '/api/health',
  summary: 'System health probe',
  description: 'Kubernetes/Docker liveness probe auditing MongoDB status, Redis latency, and memory utilization.',
  responses: {
    200: {
      description: 'System is fully operational and healthy',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            timestamp: z.string(),
            database: z.string(),
            redis: z.string(),
            uptime: z.number(),
            memory: z.object({
              heapUsed: z.number(),
              rss: z.number(),
            }),
          }),
        },
      },
    },
  },
});

// 2. Booking Session
registry.registerPath({
  method: 'get',
  path: '/api/bookings/session',
  summary: 'Retrieve cryptographic booking session',
  description: 'Generates a secure UUID session ID and signs it inside a JWT session token to grant transient seat booking authorization.',
  responses: {
    200: {
      description: 'Transient session token created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              token: z.string(),
              sessionId: z.string(),
            }),
          }),
        },
      },
    },
  },
});

// 3. Create Checkout Booking
registry.registerPath({
  method: 'post',
  path: '/api/bookings',
  summary: 'Initiate a checkout ticket booking',
  description: 'Checks seat/general capacity, lock ownership constraints, calculates pricing and coupon discounts, and creates a pending transaction.',
  request: {
    headers: z.object({
      'x-session-id': z.string().describe('Cryptographically signed JWT session token'),
    }),
    body: {
      content: {
        'application/json': {
          schema: checkoutModel,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Pending booking transaction generated successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              _id: z.string(),
              bookingId: z.string(),
              totalAmount: z.number(),
              status: z.string(),
            }),
          }),
        },
      },
    },
    400: { description: 'Invalid event capacity, inactive coupon, or locking constraints violated' },
    429: { description: 'Abuse protection limit exceeded' },
  },
});

// 4. Retrieve Booking Identity
registry.registerPath({
  method: 'get',
  path: '/api/bookings/{bookingId}',
  summary: 'Retrieve booking and scan-ready tickets details',
  description: 'Returns the payment details and ticketholder QR codes if confirmed. Access is strictly authorized to the session/user owner.',
  request: {
    params: z.object({
      bookingId: z.string().describe('Mongoose ObjectId or human-readable Booking ID (e.g. MAD-2026-ABCDE)'),
    }),
    headers: z.object({
      'x-session-id': z.string().optional().describe('JWT session token to prove transient ownership'),
    }),
  },
  responses: {
    200: {
      description: 'Booking details fetched successfully',
    },
    403: { description: 'Forbidden — Client is not the owner of this booking session' },
    404: { description: 'Booking reference not found' },
  },
});

// 5. Verify Gateway Payment
registry.registerPath({
  method: 'post',
  path: '/api/payments/verify',
  summary: 'Verify Razorpay signature and confirm booking',
  description: 'Cryptographically verifies the payment gateway HMAC signature. Upon success, booking is confirmed and ticket generation is dispatched.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: paymentVerificationModel,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Payment signature verified and booking finalized',
    },
    400: { description: 'Cryptographic signature mismatch or booking already confirmed' },
  },
});

// 6. Diagnostics Reports
registry.registerPath({
  method: 'get',
  path: '/api/admin/diagnostics/system',
  summary: 'Get system real-time telemetry metrics',
  description: 'Returns real-time connection counters, Redis connection status, oldest waiting BullMQ job ages, and dead-letter queue backlogs.',
  responses: {
    200: {
      description: 'Telemetry report compiled',
    },
    401: { description: 'Unauthorized — Admin credentials required' },
  },
});

// 7. Bulk DLQ Re-enqueue Recovery
registry.registerPath({
  method: 'post',
  path: '/api/admin/diagnostics/dlq/retry-all',
  summary: 'Bulk retry dead letter queue jobs',
  description: 'Re-queues up to 500 dead-letter queue records and removes them from the DLQ logging database upon success.',
  responses: {
    200: {
      description: 'Bulk recovery executed',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              successCount: z.number(),
              failedCount: z.number(),
            }),
          }),
        },
      },
    },
    401: { description: 'Unauthorized' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/events/{slug}/gallery',
  summary: 'Get public event gallery',
  description: 'Returns only PUBLIC items and published gallery settings.',
  request: {
    params: z.object({
      slug: z.string()
    })
  },
  responses: {
    200: { description: 'Success' },
    404: { description: 'Not found or not published' }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/admin/events/{eventId}/gallery',
  summary: 'Admin: Get event gallery',
  description: 'Returns all items (public/private) and gallery settings.',
  request: { params: z.object({ eventId: z.string() }) },
  responses: { 200: { description: 'Success' } }
});

registry.registerPath({
  method: 'post',
  path: '/api/admin/events/{eventId}/gallery/items',
  summary: 'Admin: Add gallery items',
  request: {
    params: z.object({ eventId: z.string() }),
    body: {
      content: { 'application/json': { schema: addGalleryItemsSchema } }
    }
  },
  responses: { 200: { description: 'Success' } }
});

registry.registerPath({
  method: 'patch',
  path: '/api/admin/events/{eventId}/gallery/items/order',
  summary: 'Admin: Bulk reorder gallery items',
  request: {
    params: z.object({ eventId: z.string() }),
    body: {
      content: { 'application/json': { schema: reorderGalleryItemsSchema } }
    }
  },
  responses: { 200: { description: 'Success' } }
});

registry.registerPath({
  method: 'patch',
  path: '/api/admin/events/{eventId}/gallery/items/{itemId}/cover',
  summary: 'Admin: Set cover image',
  request: {
    params: z.object({ eventId: z.string(), itemId: z.string() }),
    body: {
      content: { 'application/json': { schema: setCoverImageSchema } }
    }
  },
  responses: { 200: { description: 'Success' } }
});

registry.registerPath({
  method: 'patch',
  path: '/api/admin/events/{eventId}/gallery/items/{itemId}',
  summary: 'Admin: Update gallery item',
  request: {
    params: z.object({ eventId: z.string(), itemId: z.string() }),
    body: {
      content: { 'application/json': { schema: updateGalleryItemSchema } }
    }
  },
  responses: { 200: { description: 'Success' } }
});

registry.registerPath({
  method: 'delete',
  path: '/api/admin/events/{eventId}/gallery/items/{itemId}',
  summary: 'Admin: Delete gallery item',
  request: {
    params: z.object({ eventId: z.string(), itemId: z.string() })
  },
  responses: { 200: { description: 'Success' } }
});

registry.registerPath({
  method: 'patch',
  path: '/api/admin/events/{eventId}/gallery/settings',
  summary: 'Admin: Update gallery settings',
  request: {
    params: z.object({ eventId: z.string() }),
    body: {
      content: { 'application/json': { schema: updateGallerySettingsSchema } }
    }
  },
  responses: { 200: { description: 'Success' } }
});

export function generateOpenApiDocument(): any {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'MAD Entertainment - Operational API Spec',
      description: 'Production-ready, highly observable and resilient transactional API specification for seat layouts, ticketing, payments, and background worker queues.',
    },
    servers: [{ url: '/' }],
  });
}
