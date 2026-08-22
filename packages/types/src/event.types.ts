import type { BookingMode, EventCategory, EventStatus, TicketTier } from '@mad/shared';

import type { ImageAsset } from './common.types';

export type TicketOfferRules = {
  discountType: 'percentage' | 'flat' | 'none';
  discountValue: number;
  minQtyRequired: number;
  buyQty?: number;
  freeTicketQty?: number;
};

export type TicketTierConfig = {
  tier: TicketTier;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  discount?: number;
  totalCapacity: number;
  soldCount?: number;
  groupSize?: number;
  minPerBooking?: number;
  maxPerBooking?: number;
  availabilityWindow?: {
    startDate?: string | Date;
    endDate?: string | Date;
  };
  groupId?: string;
  groupName?: string;
  isFree?: boolean;
  offerRules?: TicketOfferRules;
  isActive?: boolean;
};

export type TicketConfig = {
  tier: TicketTier;
  name: string;
  description?: string;
  price: number;
  isFree?: boolean;
  totalCapacity: number;
  minPerBooking?: number;
  maxPerBooking?: number;
  groupSize?: number;
  availabilityWindow?: {
    startDate?: string | Date;
    endDate?: string | Date;
  };
  offerRules?: TicketOfferRules;
  isActive?: boolean;
};

export type TicketGroup = {
  name: string;
  slug: string;
  description?: string;
  tickets: TicketConfig[];
};

export type TicketProfile = {
  _id: string;
  name: string;
  description?: string;
  groups: TicketGroup[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type TicketOverride = {
  tier: TicketTier;
  price?: number;
  totalCapacity?: number;
  isActive?: boolean;
  maxPerBooking?: number;
  minPerBooking?: number;
};

export interface EventBookingCTA {
  text: string;
  disabled: boolean;
  variant: 'primary' | 'secondary' | 'disabled';
  action: 'BOOK' | 'VIEW' | 'NONE' | 'GALLERY';
}

export type Event = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  category: EventCategory;
  bookingMode?: BookingMode;
  status: EventStatus;
  doorsOpenTime?: string;
  showTime?: string;
  venue: string;
  startDate: string | Date;
  endDate?: string | Date;
  bookingStartDate?: string | Date;
  bookingEndDate?: string | Date;
  bannerImage?: ImageAsset;
  posterImage?: ImageAsset;
  djOperatorIds?: string[];
  ticketTiers: TicketTierConfig[];
  isSoldOut?: boolean;
  highlights?: string[];
  refundPolicy?: string;
  organizerName?: string;
  ageRestriction?: number;
  requireTerms?: boolean;
  requireAgeConfirmation?: boolean;
  dresscode?: string;
  additionalInfo?: string;
  ticketProfileId?: string;
  ticketOverrides?: TicketOverride[];
  totalCapacity?: number;
  soldCount?: number;
  reservedCount?: number;
  ticketsSold?: number;
  ticketsCheckedIn?: number;
  ticketsRemaining?: number;
  attendancePercentage?: number;
  noShowCount?: number;
  noShowPercentage?: number;
  tags?: string[];
  showCountdown?: boolean;
  isEarlyBird?: boolean;
  earlyBirdDeadline?: string | Date;
  countryCode?: string;
  currency?: string;
  taxLabel?: string;
  taxPercentage?: number;
  locale?: string;
  galleryImages?: ImageAsset[];

  // Booking Eligibility (Single Source of Truth from Backend)
  bookingAllowed?: boolean;
  bookingReason?: string;
  eventState?: string;
  bookingCTA?: EventBookingCTA;

  // Decoupled Status States
  lifecycle?: string;
  visibility?: {
    public: boolean;
    discoverable: boolean;
  };
  booking?: {
    status: string;
    reason: string;
  };
  gallery?: {
    status: 'NONE' | 'DRAFT' | 'PUBLISHED';
    itemCount: number;
  };
  capabilities?: {
    canBook: boolean;
    canViewGallery: boolean;
    canUploadGallery: boolean;
    canPublishGallery: boolean;
  };
};

export type Seat = {
  seatId: string;
  row: string;
  number: number;
  section?: string;
  status: string;
  tier: TicketTier;
  price: number;
  lockedBy?: string;
};

export type SeatLayout = {
  _id?: string;
  eventId?: string;
  seats: Seat[];
};

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export enum MediaVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export interface EventGalleryItem {
  id: string;
  eventId: string;
  mediaType: MediaType;
  url: string;
  publicId: string;
  thumbnail?: string;
  caption?: string;
  sortOrder: number;
  isCover: boolean;
  visibility: MediaVisibility;
  uploadedBy?: string;
  assetProvider: string;
  assetVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventGallerySettings {
  id: string;
  eventId: string;
  heading?: string;
  thankYouMessage?: string;
  highlights?: string[];
  published: boolean;
  publishedAt?: string;
  publishedBy?: string;
  createdAt: string;
  updatedAt: string;
}
