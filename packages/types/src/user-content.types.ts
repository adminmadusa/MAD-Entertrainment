import type { PaymentStatus } from '@mad/shared';

import type { ImageAsset } from './common.types';

export type DJOperator = {
  _id: string;
  name: string;
  slug?: string;
  bio?: string;
  profileImage?: ImageAsset;
  specialties?: string[];
  galleryImages?: ImageAsset[];
  experienceYears?: number;
  socialLinks?: { platform: string; url: string }[];
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
};

export type Coupon = {
  _id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  validFrom: string | Date;
  validUntil: string | Date;
  isActive: boolean;
  applicableEventIds?: string[];
  applicableCategories?: string[];
  usedCount?: number;
  usageLimit?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
};

export type PopupCampaign = {
  _id: string;
  name?: string;
  title: string;
  description?: string;
  image?: ImageAsset;
  ctaUrl?: string;
  ctaText?: string;
  trigger: string;
  triggerDelay?: number;
  cooldownHours?: number;
  showOnPages?: string[];
  endDate?: string | Date;
  linkedEvent?: {
    showCountdown?: boolean;
    startDate?: string | Date;
    earlyBirdDeadline?: string | Date;
    title?: string;
    soldCount?: number;
    totalCapacity?: number;
  };
  priority?: number;
  isActive?: boolean;
  linkedEventId?: string;
  startDate?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
};

export type Admin = {
  _id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  lastLogin?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
};

export type Payment = {
  _id?: string;
  bookingId: string;
  gateway: 'stripe' | 'razorpay';
  status: PaymentStatus;
  amount: number;
  currency: string;
  couponId?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  paidAt?: string | Date;
  failedAt?: string | Date;
  failureReason?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type Notification = {
  _id?: string;
  userId?: string;
  guestEmail?: string;
  type: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  status?: 'queued' | 'processing' | 'sent' | 'failed';
  jobId?: string;
  errorMessage?: string;
  queuedAt?: string | Date;
  processedAt?: string | Date;
  sentAt?: string | Date;
  channel: string;
  recipient?: string;
  subject?: string;
  isSent: boolean;
  retryCount: number;
  failureReason?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export interface User {
  _id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  picture?: string;
  isActive: boolean;
  lastLogin?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface AuthUser {
  userId: string;
  email?: string;
  phone?: string;
  name?: string;
  isGuest?: boolean;
  isEmailVerified?: boolean;
  picture?: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
}
