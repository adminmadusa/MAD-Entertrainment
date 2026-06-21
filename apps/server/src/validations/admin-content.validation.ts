import { z } from 'zod';
import { EventCategory, BookingMode, BookingStatus, EventStatus, PopupTrigger, TicketTier } from '@mad/shared';
import { objectIdSchema } from '@mad/validations';

// -- Common schemas --
const cloudinaryImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
  hash: z.string().optional(),
});

const strictCloudinaryImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  alt: z.string().max(200).optional(),
}).strict();

const isoDateTimeSchema = z.string().datetime();

const hasAtLeastOneField = (data: Record<string, unknown>) => Object.keys(data).length > 0;

export const adminIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }).strict(),
});

const bookingReferenceSchema = z
  .string()
  .regex(/^MAD-\d{4}-[A-Z0-9]{5}$/, 'Invalid booking reference format (expected MAD-YYYY-XXXXX)')
  .max(20);

export const adminBookingIdentifierParamSchema = z.object({
  params: z.object({
    id: z.union([objectIdSchema, bookingReferenceSchema]),
  }).strict(),
});

const adminPaginationLimitSchema = z.coerce.number().int().positive().max(100);

export const adminBookingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: adminPaginationLimitSchema.default(15),
  search: z.string().max(200).optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  eventId: objectIdSchema.optional(),
}).strict();

// -- Coupon Validation --
const couponFieldsSchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required').max(50).transform((value) => value.toUpperCase()),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0),
  maxDiscount: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).optional(),
  validFrom: isoDateTimeSchema,
  validUntil: isoDateTimeSchema,
  usageLimit: z.number().int().min(1),
  isActive: z.boolean().optional(),
  applicableEventIds: z.array(objectIdSchema).optional(),
  applicableCategories: z.array(z.nativeEnum(EventCategory)).optional(),
}).strict();

const validateCouponRules = (data: Partial<z.infer<typeof couponFieldsSchema>>, ctx: z.RefinementCtx) => {
  if (data.discountType === 'percentage' && typeof data.discountValue === 'number' && data.discountValue > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountValue'],
      message: 'Percentage discount cannot exceed 100',
    });
  }

  if (data.validFrom && data.validUntil && new Date(data.validUntil).getTime() < new Date(data.validFrom).getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['validUntil'],
      message: 'validUntil must be after validFrom',
    });
  }
};

export const createCouponSchema = z.object({
  body: couponFieldsSchema.superRefine(validateCouponRules),
});

export const updateCouponSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: couponFieldsSchema
    .partial()
    .refine(hasAtLeastOneField, 'At least one field is required')
    .superRefine(validateCouponRules),
});

// -- Popup Validation --
const optionalUrlSchema = z.union([z.string().trim().max(2048).url(), z.literal('')]).optional();

const popupLinkedEventSchema = z.object({
  eventId: objectIdSchema.optional(),
  showCountdown: z.boolean().optional(),
  earlyBirdDeadline: isoDateTimeSchema.optional(),
}).strict();

const popupFieldsSchema = z.object({
  name: z.string().trim().min(1, 'Popup name is required').max(150),
  title: z.string().trim().min(1, 'Popup title is required').max(200),
  description: z.string().trim().max(1000).optional(),
  image: strictCloudinaryImageSchema.optional(),
  ctaUrl: optionalUrlSchema,
  ctaText: z.string().trim().max(100).optional(),
  trigger: z.nativeEnum(PopupTrigger).default(PopupTrigger.ON_LOAD),
  triggerDelay: z.number().int().min(0).optional(),
  cooldownHours: z.number().int().min(0).optional(),
  priority: z.number().int().min(0).optional(),
  showOnPages: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  isActive: z.boolean().optional(),
  startDate: isoDateTimeSchema.optional(),
  endDate: isoDateTimeSchema.optional(),
  linkedEventId: objectIdSchema.optional(),
  linkedEvent: popupLinkedEventSchema.optional(),
}).strict();

const validatePopupDateRange = (data: Partial<z.infer<typeof popupFieldsSchema>>, ctx: z.RefinementCtx) => {
  if (data.startDate && data.endDate && new Date(data.endDate).getTime() < new Date(data.startDate).getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'endDate must be after startDate',
    });
  }
};

export const createPopupSchema = z.object({
  body: popupFieldsSchema.superRefine(validatePopupDateRange),
});

export const updatePopupSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: popupFieldsSchema
    .partial()
    .refine(hasAtLeastOneField, 'At least one field is required')
    .superRefine(validatePopupDateRange),
});

// -- Refund Validation --
export const createRefundSchema = z.object({
  body: z.object({
    bookingId: objectIdSchema,
    paymentId: objectIdSchema,
    amount: z.number().positive('Refund amount must be greater than zero'),
    reason: z.string().trim().max(1000).optional(),
    idempotencyKey: z.string().trim().max(100).optional(),
    cancelTickets: z.boolean().optional(),
  }).strict(),
});

export const processRefundSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: z.object({
    action: z.enum(['approve', 'reject']),
    adminNotes: z.string().trim().max(2000).optional(),
    gatewayRefundId: z.string().trim().max(100).optional(),
    manualOverride: z.boolean().optional(),
    overrideReason: z.string().trim().max(1000).optional(),
  }).strict().superRefine((data, ctx) => {
    // PRICING-003: Schema-level enforcement — overrideReason must be >= 10 chars when manualOverride is true
    if (data.manualOverride === true) {
      if (!data.overrideReason || data.overrideReason.trim().length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['overrideReason'],
          message: 'Override reason must be at least 10 characters when manualOverride is true',
        });
      }
    }
  }),
});

// -- Scanner Validation --
const scannerReferenceSchema = z
  .string()
  .trim()
  .min(1, 'Reference is required')
  .max(100, 'Reference is too long')
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Invalid scanner reference format');

export const scannerScanSchema = z.object({
  body: z.object({
    ticketId: z.string().trim().min(1, 'Ticket ID is required').max(100),
    eventId: objectIdSchema,
  }).strict(),
});

export const scannerLookupSchema = z.object({
  params: z.object({
    reference: scannerReferenceSchema,
  }).strict(),
  query: z.object({
    eventId: objectIdSchema,
  }).strict(),
});

// -- Category Validation --
const categoryBodySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
}).strict();

export const createCategorySchema = z.object({
  body: categoryBodySchema,
});

export const updateCategorySchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: categoryBodySchema
    .partial()
    .refine(hasAtLeastOneField, 'At least one field is required'),
});

// -- Tier Validation --
const tierBodySchema = z.object({
  name: z.string().trim().min(1, 'Tier name is required').max(100),
}).strict();

export const createTierSchema = z.object({
  body: tierBodySchema,
});

export const updateTierSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: tierBodySchema
    .partial()
    .refine(hasAtLeastOneField, 'At least one field is required'),
});


// -- DJ Operator Validation --
export const createDJOperatorSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required'),
    bio: z.string().max(3000).optional(),
    specialties: z.array(z.string()).optional(),
    profileImage: cloudinaryImageSchema.optional(),
    socialLinks: z
      .array(
        z.object({
          platform: z.string(),
          url: z.string().url(),
        })
      )
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateDJOperatorSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: createDJOperatorSchema.shape.body.partial(),
});

export const deleteUploadSchema = z.object({
  body: z.object({
    publicId: z.string().min(1, 'publicId is required'),
  }).strict(),
});

// -- Event Validation --
export const validateEventImages = (body: any, ctx: z.RefinementCtx) => {
  const banner = body.bannerImage;
  const poster = body.posterImage;
  const gallery = body.galleryImages;

  const hasBanner = !!banner;
  const hasPoster = !!poster;
  const galleryCount = Array.isArray(gallery) ? gallery.length : 0;
  const totalCount = (hasBanner ? 1 : 0) + (hasPoster ? 1 : 0) + galleryCount;
  if (totalCount > 15) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Total event images cannot exceed 15',
      path: ['galleryImages'],
    });
  }

  const seenPublicIds = new Set<string>();
  const seenHashes = new Set<string>();

  const checkImg = (img: any, path: string | (string | number)[]) => {
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
  if (Array.isArray(gallery)) {
    gallery.forEach((img, idx) => {
      checkImg(img, ['galleryImages', idx]);
    });
  }
};

const eventBodySchema = z.object({
    title: z.string().min(1).max(200),
    slug: z.string().min(1),
    description: z.string().min(1).max(5000),
    category: z.string().min(1),
    status: z.nativeEnum(EventStatus).optional(),
    bookingMode: z.nativeEnum(BookingMode),
    bannerImage: cloudinaryImageSchema,
    posterImage: cloudinaryImageSchema.optional(),
    galleryImages: z.array(cloudinaryImageSchema).optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    doorsOpenTime: z.string().optional(),
    showTime: z.string().optional(),
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
    isFeatured: z.boolean().optional(),
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
  body: eventBodySchema.superRefine(validateEventImages),
});

export const updateEventSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: eventBodySchema.partial().extend({
    eventVersion: z.number().int().nonnegative(),
  }).superRefine(validateEventImages),
});

export const adminEventsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(15),
    search: z.string().max(200).optional(),
    status: z.nativeEnum(EventStatus).optional(),
  }).strict(),
});


// -- Ticket Profile Validation --
const ticketOfferRulesSchema = z.object({
  discountType: z.enum(['percentage', 'flat', 'none']),
  discountValue: z.number().min(0),
  minQtyRequired: z.number().int().min(1),
  buyQty: z.number().int().min(1).optional(),
  freeTicketQty: z.number().int().min(1).optional(),
});

const ticketConfigSchema = z.object({
  tier: z.nativeEnum(TicketTier),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  isFree: z.boolean().optional(),
  totalCapacity: z.number().int().min(1),
  minPerBooking: z.number().int().min(1).optional(),
  maxPerBooking: z.number().int().min(1).optional(),
  groupSize: z.number().int().min(1).optional(),
  availabilityWindow: z.object({
    startDate: z.string().datetime().or(z.date()),
    endDate: z.string().datetime().or(z.date()),
  }).optional(),
  offerRules: ticketOfferRulesSchema.optional(),
  isActive: z.boolean().optional(),
});

const ticketGroupSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  tickets: z.array(ticketConfigSchema),
});

export const createTicketProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Profile name is required'),
    description: z.string().optional(),
    groups: z.array(ticketGroupSchema).default([]),
    isActive: z.boolean().optional(),
  }),
});

export const updateTicketProfileSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: createTicketProfileSchema.shape.body.partial(),
});
