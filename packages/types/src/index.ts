export type ApiError = {
  message: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
  errors?: Record<string, string[]>;
};

export type ImageAsset = {
  url?: string;
  publicId?: string;
};

export type TicketTierConfig = {
  tier: string;
  tierName?: string;
  name?: string;
  description?: string;
  price: number;
  discount?: number;
  quantity?: number;
  soldCount?: number;
  groupSize?: number;
  availabilityWindow?: {
    startDate?: string | Date;
    endDate?: string | Date;
  };
};

export type Event = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  category: string;
  bookingMode?: string;
  doorsOpenTime?: string;
  showTime?: string;
  venueId?: any;
  startDate: string | Date;
  bannerImage?: ImageAsset;
  ticketTiers: TicketTierConfig[];
  isSoldOut?: boolean;
};

export type Seat = {
  seatId: string;
  row: string;
  number: number;
  section?: string;
  status: string;
  tier: string;
  price: number;
  lockedBy?: string;
};

export type SeatLayout = {
  _id?: string;
  eventId?: string;
  seats: Seat[];
};

export type DJOperator = {
  _id: string;
  name: string;
  slug?: string;
  bio?: string;
  profileImage?: ImageAsset;
  specialties?: string[];
  [key: string]: any;
};
export type Artist = { _id: string; name: string; [key: string]: any };
export type Venue = { _id: string; name: string; [key: string]: any };
export type Coupon = { _id: string; code: string; [key: string]: any };
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
  [key: string]: any;
};
export type Admin = { _id: string; [key: string]: any };

export type Booking = {
  _id?: string;
  bookingId: string;
  eventId: string;
  userId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  sessionId?: string;
  tickets: {
    tier: string;
    tierName: string;
    quantity: number;
    pricePerTicket: number;
    subtotal: number;
    seats?: {
      seatId: string;
      row: string;
      number: number;
      section?: string;
    }[];
  }[];
  totalTickets: number;
  subtotal: number;
  convenienceFee: number;
  gst: number;
  discount: number;
  totalAmount: number;
  currency: string;
  couponCode?: string;
  couponId?: string;
  status: string;
  paymentId?: string;
  reservationIds?: string[];
  bookingVersion: number;
  expiresAt?: string | Date;
  cancellationReason?: string;
  cancelledAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type Ticket = {
  _id?: string;
  ticketId: string;
  bookingId: string;
  eventId: string;
  userId?: string;
  tier: string;
  tierName: string;
  price: number;
  seatId?: string;
  row?: string;
  seatNumber?: number;
  section?: string;
  guestName?: string;
  guestEmail?: string;
  status: string;
  qrCodeImage: string;
  checkedInAt?: string | Date;
  checkedInBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type Payment = {
  _id?: string;
  bookingId: string;
  gateway: 'stripe' | 'razorpay';
  status: string;
  amount: number;
  currency: string;
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
  data?: Record<string, any>;
  status?: string;
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

export type QueueJob = {
  id?: string;
  name: string;
  data: Record<string, any>;
  opts?: Record<string, any>;
};

export type DiagnosticsReport = {
  timestamp: string;
  database: {
    state: string;
    readyState: number;
    connectionsCount: number;
  };
  redis: {
    connected: boolean;
  };
  queues: {
    name: string;
    active: number;
    waiting: number;
    delayed: number;
    failed: number;
    completed: number;
    oldestWaitingJobAgeMs: number;
  }[];
  dlq: {
    totalFailedCount: number;
  };
};
