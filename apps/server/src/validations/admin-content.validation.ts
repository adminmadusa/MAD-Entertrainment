import { z } from 'zod';
import { EventCategory, BookingMode, BookingStatus, EventStatus, PopupTrigger, TicketTier } from '@mad/shared';
import { objectIdSchema } from '@mad/validations';

// -- Common schemas --
const cloudinaryImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
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
  }).strict(),
});

export const processRefundSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: z.object({
    action: z.enum(['approve', 'reject']),
    adminNotes: z.string().trim().max(2000).optional(),
    gatewayRefundId: z.string().trim().max(100).optional(),
  }).strict(),
});

// -- Scanner Validation --
export const scannerScanSchema = z.object({
  body: z.object({
    ticketId: z.string().trim().min(1, 'Ticket ID is required').max(100),
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
  params: z.object({ id: z.string() }),
  body: createDJOperatorSchema.shape.body.partial(),
});

// -- Event Validation --
export const createEventSchema = z.object({
  body: z.object({
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
    showTime: z.string(),
    venue: z.string().min(1),
    onlineStreamUrl: z.string().url().optional(),
    isOnline: z.boolean().optional(),
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
    ticketOverrides: z.array(z.object({
      tier: z.string(),
      price: z.number().min(0).optional(),
      totalCapacity: z.number().int().min(1).optional(),
      isActive: z.boolean().optional(),
      maxPerBooking: z.number().int().min(1).optional(),
      minPerBooking: z.number().int().min(1).optional(),
    })).optional(),
  }),
});

export const updateEventSchema = z.object({
  params: z.object({ id: z.string() }),
  body: createEventSchema.shape.body.partial(),
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
  params: z.object({ id: z.string() }),
  body: createTicketProfileSchema.shape.body.partial(),
});
