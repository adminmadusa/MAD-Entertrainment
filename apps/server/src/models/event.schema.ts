import { EventCategory, BookingMode, EventStatus, TicketTier } from '@mad/shared';
import { Schema, model, Document, Types } from 'mongoose';

const cloudinaryImageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: Number,
    height: Number,
    format: String,
    blurDataUrl: String,
  },
  { _id: false }
);

const ticketOfferRulesSchema = new Schema(
  {
    discountType: { type: String, enum: ['percentage', 'flat', 'none'], default: 'none' },
    discountValue: { type: Number, default: 0 },
    minQtyRequired: { type: Number, default: 1 },
    buyQty: Number,
    freeTicketQty: Number,
  },
  { _id: false }
);

const ticketTierConfigSchema = new Schema(
  {
    tier: { type: String, enum: Object.values(TicketTier), required: true },
    name: { type: String, required: true },
    slug: { type: String, lowercase: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    totalCapacity: { type: Number, required: true, min: 1 },
    soldCount: { type: Number, default: 0, min: 0 },
    groupSize: { type: Number, default: 1, min: 1 },
    minPerBooking: { type: Number, default: 1, min: 1 },
    description: String,
    perks: [String],
    tags: [String],
    discount: { type: Number, min: 0 },
    taxPercent: { type: Number, min: 0, max: 100 },
    availabilityWindow: {
      startDate: Date,
      endDate: Date,
    },
    isActive: { type: Boolean, default: true },
    maxPerBooking: { type: Number, default: 10 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    groupId: String,
    groupName: String,
    isFree: { type: Boolean, default: false },
    offerRules: ticketOfferRulesSchema,
  },
  { _id: false }
);

export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  category: EventCategory;
  status: EventStatus;
  bookingMode: BookingMode;
  bannerImage: { url: string; publicId: string };
  posterImage?: { url: string; publicId: string };
  galleryImages?: { url: string; publicId: string }[];
  startDate: Date;
  endDate?: Date;
  doorsOpenTime?: string;
  showTime?: string;
  venue: string;

  djOperatorIds?: Types.ObjectId[];
  ticketTiers: {
    tier: TicketTier;
    name: string;
    slug?: string;
    price: number;
    totalCapacity: number;
    soldCount: number;
    groupSize?: number;
    minPerBooking?: number;
    description?: string;
    perks?: string[];
    tags?: string[];
    discount?: number;
    taxPercent?: number;
    availabilityWindow?: {
      startDate: Date;
      endDate: Date;
    };
    isActive: boolean;
    maxPerBooking?: number;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: Types.ObjectId;
    groupId?: string;
    groupName?: string;
    isFree?: boolean;
    offerRules?: {
      discountType: 'percentage' | 'flat' | 'none';
      discountValue: number;
      minQtyRequired: number;
      buyQty?: number;
      freeTicketQty?: number;
    };
  }[];
  totalCapacity: number;
  ticketProfileId?: Types.ObjectId;
  ticketOverrides?: {
    tier: string;
    price?: number;
    totalCapacity?: number;
    isActive?: boolean;
    maxPerBooking?: number;
    minPerBooking?: number;
  }[];
  soldCount: number;
  reservedCount: number;
  eventVersion: number;
  isFeatured: boolean;
  isSoldOut: boolean;
  seatLayoutId?: Types.ObjectId;
  tags?: string[];
  ageRestriction?: number;
  dresscode?: string;
  additionalInfo?: string;
  showCountdown?: boolean;
  isEarlyBird?: boolean;
  earlyBirdDeadline?: Date;
  requireTerms: boolean;
  requireAgeConfirmation: boolean;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  highlights?: string[];
  refundPolicy?: string;
  organizerName?: string;
}

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, required: true, maxlength: 5000 },
    category: { type: String, required: true, index: true },
    status: { type: String, enum: Object.values(EventStatus), default: EventStatus.DRAFT, index: true },
    bookingMode: { type: String, enum: Object.values(BookingMode), required: true },

    bannerImage: { type: cloudinaryImageSchema, required: true },
    posterImage: cloudinaryImageSchema,
    galleryImages: [cloudinaryImageSchema],

    startDate: { type: Date, required: true, index: true },
    endDate: Date,
    doorsOpenTime: String,
    showTime: String,

    venue: { type: String, required: true, index: true },


    djOperatorIds: [{ type: Schema.Types.ObjectId, ref: 'DJOperator' }],

    ticketTiers: { type: [ticketTierConfigSchema], default: [] },
    ticketProfileId: { type: Schema.Types.ObjectId, ref: 'TicketProfile', index: true },
    ticketOverrides: {
      type: [
        {
          tier: { type: String, required: true },
          price: Number,
          totalCapacity: Number,
          isActive: Boolean,
          maxPerBooking: Number,
          minPerBooking: Number,
          _id: false,
        },
      ],
      default: [],
    },
    totalCapacity: { type: Number, required: true, min: 1 },
    soldCount: { type: Number, default: 0, min: 0 },
    reservedCount: { type: Number, default: 0, min: 0 },
    eventVersion: { type: Number, default: 1, min: 1 },
    isFeatured: { type: Boolean, default: false, index: true },
    isSoldOut: { type: Boolean, default: false },

    seatLayoutId: { type: Schema.Types.ObjectId, ref: 'SeatLayout' },

    tags: [String],
    ageRestriction: Number,
    dresscode: String,
    additionalInfo: String,
    showCountdown: { type: Boolean, default: false },
    isEarlyBird: { type: Boolean, default: false },
    earlyBirdDeadline: Date,
    requireTerms: { type: Boolean, default: true },
    requireAgeConfirmation: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    highlights: [String],
    refundPolicy: { type: String, maxlength: 1000 },
    organizerName: { type: String, maxlength: 100 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);



// ─── Indexes ──────────────────────────────────────────────────
eventSchema.index({ startDate: 1, status: 1 });
eventSchema.index({ category: 1, status: 1, startDate: 1 });
eventSchema.index({ isFeatured: 1, status: 1 });
eventSchema.index({ isDeleted: 1, status: 1, startDate: 1 });
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const Event = model<IEvent>('Event', eventSchema);
