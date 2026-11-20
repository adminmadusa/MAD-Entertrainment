/**
 * Canonical SSOT: Admin content and operational validation schemas.
 * 
 * All admin validation schemas have been migrated to `@mad/validations` (VAL-SSOT)
 * to ensure single source of truth across server and admin frontend surfaces.
 * 
 * Re-exported here for seamless backward compatibility with existing route handlers.
 */

export {
  // Common & Admin Parameters
  adminIdParamSchema,
  adminBulkIdsSchema,
  bookingReferenceSchema,
  adminBookingIdentifierParamSchema,
  adminPaginationLimitSchema,
  adminBookingsQuerySchema,
  bookingsSummarySchema,
  cancelBookingSchema,
  correctBookingEmailSchema,
  resendBookingTicketsSchema,

  // Content Schemas
  createCouponSchema,
  updateCouponSchema,
  createPopupSchema,
  updatePopupSchema,
  createCategorySchema,
  updateCategorySchema,
  createTierSchema,
  updateTierSchema,

  // Media, Operators & Profiles
  createDJOperatorSchema,
  updateDJOperatorSchema,
  deleteUploadSchema,
  createTicketProfileSchema,
  updateTicketProfileSchema,

  // Operations & Scanner
  createRefundSchema,
  processRefundSchema,
  scannerScanSchema,
  scannerStatsSchema,
  scannerHistorySchema,
} from '@mad/validations';
