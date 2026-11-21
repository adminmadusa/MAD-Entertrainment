// ============================================================
// MAD Entertrainment — Payment & Inventory Constants & Enums
// ============================================================

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum ReservationStatus {
  RESERVED = 'reserved',
  PENDING_PAYMENT = 'pending_payment',
  CONFIRMED = 'confirmed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum InventoryState {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  PENDING_PAYMENT = 'pending_payment',
  BOOKED = 'booked',
  EXPIRED = 'expired',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentGateway {
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
}

export enum PaymentMethod {
  UPI = 'upi',
  CARD = 'card',
  NET_BANKING = 'net_banking',
  WALLET = 'wallet',
  STRIPE_CARD = 'stripe_card',
}

export enum TicketTier {
  GENERAL = 'general',
  SILVER = 'silver',
  GOLD = 'gold',
  VIP = 'vip',
  VVIP = 'vvip',
  PLATINUM = 'platinum',
  BACKSTAGE = 'backstage',
  COUPLE = 'couple',
  GROUP = 'group',
  FAMILY = 'family',
  EARLY_BIRD = 'early_bird',
  CUSTOM = 'custom',
}

export enum SeatStatus {
  AVAILABLE = 'available',
  LOCKED = 'locked',
  BOOKED = 'booked',
  BLOCKED = 'blocked',
  WHEELCHAIR = 'wheelchair',
}

export enum RefundStatus {
  REQUESTED = 'requested',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
