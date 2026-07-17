import { z } from 'zod';
import { EventCategory, EventStatus, BookingMode, TicketTier, type EventLifecycleStatus } from '@mad/shared';
import { objectIdSchema } from '@mad/validations';

// ─── Common / Helpers ──────────────────────────────────────────

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => String(value));

const paginationLimitSchema = z.coerce.number().int().positive().max(100);

const cloudinaryImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
  hash: z.string().optional(),
});

export const adminIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }).strict(),
});

// ─── Public Schemas ─────────────────────────────────────────────

export const listEventsQuerySchema = z.object({
  category: z.nativeEnum(EventCategory).optional(),
  status: z.string().optional(), // Make status a string for backward compatibility
  state: z.string().optional(),
  sort: z.string().optional(),
  exclude: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: paginationLimitSchema.default(12),
  includeTotal: booleanQuerySchema.optional(),
}).strict();

export const getEventSeatLayoutParamSchema = z.object({
  eventId: objectIdSchema,
}).strict();

// ─── Admin Schemas ──────────────────────────────────────────────

type EventImageValidationAsset = {
  publicId?: string;
  hash?: string;
};

type EventImageValidationBody = {
  bannerImage?: EventImageValidationAsset;
  posterImage?: EventImageValidationAsset;
};

const eventLifecycleStatuses = Object.values(EventStatus) as [EventLifecycleStatus, ...EventLifecycleStatus[]];
const eventLifecycleStatusSchema = z.enum(eventLifecycleStatuses);

export const validateEventImages = (body: EventImageValidationBody, ctx: z.RefinementCtx) => {
  const banner = body.bannerImage;
  const poster = body.posterImage;

  const hasBanner = !!banner;
  const hasPoster = !!poster;
  const totalCount = (hasBanner ? 1 : 0) + (hasPoster ? 1 : 0);
  if (totalCount > 15) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Total event images cannot exceed 15',
      path: ['bannerImage'],
    });
  }

  const seenPublicIds = new Set<string>();
  const seenHashes = new Set<string>();

  const checkImg = (img: EventImageValidationAsset | undefined, path: string | (string | number)[]) => {
    if (!img) return;
    if (img.publicId) {
      if (seenPublicIds.has(img.publicId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate image detected',
          path: Array.isArray(path) ? path : [path],
        });
      }
      seenPublicIds.add(img.publicId);
    }
    if (img.hash) {
      if (seenHashes.has(img.hash)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate image detected',
          path: Array.isArray(path) ? path : [path],
        });
      }
      seenHashes.add(img.hash);
    }
  };

  checkImg(banner, 'bannerImage');
  checkImg(poster, 'posterImage');
};

const validateEventDates = (body: any, ctx: z.RefinementCtx) => {
  const start = body.startDate ? new Date(body.startDate).getTime() : null;
  const end = body.endDate ? new Date(body.endDate).getTime() : null;
  const bookStart = body.bookingStartDate ? new Date(body.bookingStartDate).getTime() : null;
  const bookEnd = body.bookingEndDate ? new Date(body.bookingEndDate).getTime() : null;

  if (start && end && end <= start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Event end date must be after event start date',
      path: ['endDate'],
    });
  }

  if (bookStart && bookEnd && bookEnd <= bookStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Booking close date must be after booking open date',
      path: ['bookingEndDate'],
    });
  }

  if (bookStart && start && start <= bookStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Booking open date must be before event start date',
      path: ['bookingStartDate'],
    });
  }

  if (bookEnd && start && start < bookEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Booking close date must be before or equal to event start date',
      path: ['bookingEndDate'],
    });
  }
};

const validateEventFields = (body: any, ctx: z.RefinementCtx) => {
  validateEventImages(body, ctx);
  validateEventDates(body, ctx);
};

const eventBodySchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1),
  description: z.string().min(1).max(5000),
  category: z.string().min(1),
  status: eventLifecycleStatusSchema.optional(),
  bookingMode: z.nativeEnum(BookingMode),
  bannerImage: cloudinaryImageSchema,
  posterImage: cloudinaryImageSchema.optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  doorsOpenTime: z.string().optional(),
  showTime: z.string().optional(),
  bookingStartDate: z.string().datetime().optional(),
  bookingEndDate: z.string().datetime().optional(),
  venue: z.string().min(1),

  djOperatorIds: z.array(z.string()).optional(),
  ticketTiers: z
    .array(
      z.object({
        tier: z.nativeEnum(TicketTier),
        name: z.string(),
        slug: z.string().optional(),
        price: z.number().min(0),
        totalCapacity: z.number().int().min(1),
        groupSize: z.number().int().min(1).optional(),
        minPerBooking: z.number().int().min(1).optional(),
        maxPerBooking: z.number().int().min(1).optional(),
        description: z.string().optional(),
        perks: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        discount: z.number().min(0).optional(),
        taxPercent: z.number().min(0).max(100).optional(),
        availabilityWindow: z
          .object({
            startDate: z.string().datetime(),
            endDate: z.string().datetime(),
          })
          .optional(),
        isActive: z.boolean().optional(),
      })
    )
    .optional(),
  totalCapacity: z.number().int().min(1),
  seatLayoutId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  ageRestriction: z.number().int().min(0).optional(),
  dresscode: z.string().optional(),
  additionalInfo: z.string().optional(),
  showCountdown: z.boolean().optional(),
  isEarlyBird: z.boolean().optional(),
  earlyBirdDeadline: z.string().datetime().optional(),
  highlights: z.array(z.string()).optional(),
  refundPolicy: z.string().max(1000).optional(),
  organizerName: z.string().max(100).optional(),
  ticketProfileId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Mongoose ObjectId identifier').nullable().optional(),
  requireTerms: z.boolean().optional(),
  requireAgeConfirmation: z.boolean().optional(),
  ticketOverrides: z.array(z.object({
    tier: z.string(),
    price: z.number().min(0).optional(),
    totalCapacity: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
    maxPerBooking: z.number().int().min(1).optional(),
    minPerBooking: z.number().int().min(1).optional(),
  })).optional(),
});

export const createEventSchema = z.object({
  body: eventBodySchema.superRefine(validateEventFields),
});

export const updateEventSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: eventBodySchema.partial().extend({
    eventVersion: z.number().int().nonnegative(),
  }).superRefine(validateEventFields),
});

export const adminEventsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(15),
    search: z.string().max(200).optional(),
    status: eventLifecycleStatusSchema.optional(),
    sortField: z.string().max(50).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).strict(),
});
