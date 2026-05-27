import mongoose, { Schema, model, Document } from "mongoose";
import { TicketTier } from "@mad/shared";

export interface ITicketOfferRules {
  discountType: "percentage" | "flat" | "none";
  discountValue: number;
  minQtyRequired: number;
  buyQty?: number;
  freeTicketQty?: number;
}

export interface ITicketConfig {
  tier: TicketTier;
  name: string;
  description?: string;
  price: number;
  isFree: boolean;
  totalCapacity: number;
  minPerBooking: number;
  maxPerBooking: number;
  groupSize: number;
  availabilityWindow?: {
    startDate?: Date;
    endDate?: Date;
  };
  offerRules?: ITicketOfferRules;
  isActive: boolean;
}

export interface ITicketGroup {
  name: string;
  slug: string;
  description?: string;
  tickets: ITicketConfig[];
}

export interface ITicketProfile extends Document {
  name: string;
  description?: string;
  groups: ITicketGroup[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ticketOfferRulesSchema = new Schema(
  {
    discountType: {
      type: String,
      enum: ["percentage", "flat", "none"],
      default: "none",
    },
    discountValue: { type: Number, default: 0 },
    minQtyRequired: { type: Number, default: 1 },
    buyQty: Number,
    freeTicketQty: Number,
  },
  { _id: false },
);

const ticketConfigSchema = new Schema(
  {
    tier: { type: String, enum: Object.values(TicketTier), required: true },
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    isFree: { type: Boolean, default: false },
    totalCapacity: { type: Number, required: true, min: 1 },
    minPerBooking: { type: Number, default: 1 },
    maxPerBooking: { type: Number, default: 10 },
    groupSize: { type: Number, default: 1 },
    availabilityWindow: {
      startDate: Date,
      endDate: Date,
    },
    offerRules: ticketOfferRulesSchema,
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const ticketGroupSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: String,
    tickets: { type: [ticketConfigSchema], default: [] },
  },
  { _id: false },
);

const ticketProfileSchema = new Schema<ITicketProfile>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    groups: { type: [ticketGroupSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const TicketProfile =
  (mongoose.models.TicketProfile as mongoose.Model<ITicketProfile>) ||
  mongoose.model<ITicketProfile>("TicketProfile", ticketProfileSchema);
