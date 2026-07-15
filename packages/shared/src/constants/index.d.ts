export * from './query-keys';
export * from './storage-keys';
export declare enum EventCategory {
    MAD_EVENT = "mad_event",
    DJ_NIGHT = "dj_night",
    CONCERT = "concert",
    FESTIVAL = "festival",
    COMEDY = "comedy",
    CELEBRITY = "celebrity",
    THEATRE = "theatre",
    CINEMA = "cinema",
    VIP_EVENT = "vip_event",
    LIVE_SHOW = "live_show"
}
export declare enum BookingMode {
    SEAT_BASED = "seat_based",
    GENERAL_ADMISSION = "general_admission"
}
export declare enum EventStatus {
    DRAFT = "draft",
    PUBLISHED = "published",
    CANCELLED = "cancelled",
    POSTPONED = "postponed",
    COMPLETED = "completed",// Deprecated, will be removed in the future
    ARCHIVED = "archived"
}
export type EventLifecycleStatus = EventStatus;
export declare const EVENT_STATUS_TRANSITIONS: Readonly<Record<EventLifecycleStatus, readonly EventLifecycleStatus[]>>;
export declare const EVENT_DUPLICATION_POLICY: {
    readonly copied: readonly ["title", "description", "category", "bookingMode", "bannerImage", "posterImage", "galleryImages", "startDate", "endDate", "doorsOpenTime", "showTime", "venue", "djOperatorIds", "ticketTiers"];
    readonly reset: readonly ["_id", "slug", "createdAt", "updatedAt", "eventVersion"];
    readonly regenerated: readonly ["status"];
};
export type EventStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type EventStatusMeta = {
    label: string;
    tone: EventStatusTone;
    className: string;
};
export declare const EVENT_STATUS_METADATA: Record<EventLifecycleStatus, EventStatusMeta>;
export declare enum BookingStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    CANCELLED = "cancelled",
    REFUNDED = "refunded",
    FAILED = "failed",
    AWAITING_PAYMENT = "awaiting_payment",
    EXPIRED = "expired",
    EXPIRING = "expiring"
}
export type BookingStatusTone = 'success' | 'warning' | 'processing' | 'danger' | 'neutral' | 'refund';
export type BookingStatusMeta = {
    label: string;
    tone: BookingStatusTone;
};
export declare const BOOKING_STATUS_META: Record<BookingStatus, BookingStatusMeta>;
export declare function getBookingStatusMeta(status: string | null | undefined): BookingStatusMeta;
export declare function getBookingStatusLabel(status: string | null | undefined): string;
export declare function getBookingStatusTone(status: string | null | undefined): BookingStatusTone;
export declare enum PaymentStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    PAID = "paid",
    FAILED = "failed",
    REFUNDED = "refunded",
    CANCELLED = "cancelled",
    PARTIALLY_REFUNDED = "partially_refunded"
}
export declare enum ReservationStatus {
    RESERVED = "reserved",
    PENDING_PAYMENT = "pending_payment",
    CONFIRMED = "confirmed",
    EXPIRED = "expired",
    CANCELLED = "cancelled",
    FAILED = "failed",
    REFUNDED = "refunded"
}
export declare enum InventoryState {
    AVAILABLE = "available",
    RESERVED = "reserved",
    PENDING_PAYMENT = "pending_payment",
    BOOKED = "booked",
    EXPIRED = "expired",
    FAILED = "failed",
    REFUNDED = "refunded",
    CANCELLED = "cancelled"
}
export declare enum PaymentGateway {
    RAZORPAY = "razorpay",
    STRIPE = "stripe"
}
export declare enum PaymentMethod {
    UPI = "upi",
    CARD = "card",
    NET_BANKING = "net_banking",
    WALLET = "wallet",
    STRIPE_CARD = "stripe_card"
}
export declare enum TicketSalesCloseMode {
    EVENT_START = "EVENT_START",
    EVENT_END = "EVENT_END",
    CUSTOM_DATE = "CUSTOM_DATE"
}
export declare enum TicketTier {
    GENERAL = "general",
    SILVER = "silver",
    GOLD = "gold",
    VIP = "vip",
    VVIP = "vvip",
    PLATINUM = "platinum",
    BACKSTAGE = "backstage",
    COUPLE = "couple",
    GROUP = "group",
    FAMILY = "family",
    EARLY_BIRD = "early_bird",
    CUSTOM = "custom"
}
export declare enum EventMode {
    LIVE = "live",
    ONLINE = "online",
    HYBRID = "hybrid"
}
export declare enum SeatStatus {
    AVAILABLE = "available",
    LOCKED = "locked",
    BOOKED = "booked",
    BLOCKED = "blocked",
    WHEELCHAIR = "wheelchair"
}
export declare enum AdminRole {
    SUPER_ADMIN = "super_admin",
    ADMIN = "admin",
    MANAGER = "manager",
    SUPPORT = "support",
    SCANNER = "scanner"
}
export declare enum RefundStatus {
    REQUESTED = "requested",
    PROCESSING = "processing",
    COMPLETED = "completed",
    REJECTED = "rejected",
    FAILED = "failed"
}
export declare enum PopupTrigger {
    ON_LOAD = "on_load",
    ON_EXIT = "on_exit",
    AFTER_DELAY = "after_delay",
    ON_SCROLL = "on_scroll"
}
export declare enum NotificationType {
    BOOKING_CONFIRMED = "booking_confirmed",
    PAYMENT_FAILED = "payment_failed",
    REFUND_PROCESSED = "refund_processed",
    FULL_REFUND = "full_refund",
    PARTIAL_REFUND = "partial_refund",
    EVENT_REMINDER = "event_reminder",
    EVENT_CANCELLED = "event_cancelled",
    EVENT_UPDATED = "event_updated",
    OTP = "otp",
    MARKETING = "marketing"
}
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly BAD_GATEWAY: 502;
    readonly SERVICE_UNAVAILABLE: 503;
};
export declare const SEAT_LOCK_TTL_SECONDS: number;
export declare const MAX_TICKETS_PER_BOOKING = 10;
export declare enum EventMemoryPublicationState {
    DRAFT = "DRAFT",
    PREVIEW = "PREVIEW",
    PUBLISHED = "PUBLISHED",
    HIDDEN = "HIDDEN"
}
export declare const DEFAULT_MEMORIES_GALLERY_LIMIT = 30;
export declare const MAX_MEMORIES_GALLERY_LIMIT = 50;
export declare const POPUP_COOLDOWN_HOURS = 24;
export declare const POPUP_SESSION_KEY_PREFIX = "mad_popup_";
export declare const API_ROUTES: {
    readonly HEALTH: "/api/health";
    readonly EVENTS: "/api/events";
    readonly BOOKINGS: "/api/bookings";
    readonly PAYMENTS: "/api/payments";
    readonly USERS: "/api/users";
    readonly AUTH: "/api/auth";
    readonly ADMIN: "/api/admin";
    readonly DJ_OPERATORS: "/api/dj-operators";
    readonly COUPONS: "/api/coupons";
    readonly POPUP_CAMPAIGNS: "/api/popup-campaigns";
    readonly TICKETS: "/api/tickets";
    readonly NOTIFICATIONS: "/api/notifications";
    readonly ANALYTICS: "/api/analytics";
    readonly MEDIA: "/api/media";
};
export declare const SUPPORTED_CURRENCIES: readonly ["INR", "USD", "GBP", "EUR"];
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];
export declare const EVENT_CATEGORY_LABELS: Record<EventCategory, string>;
export * from './storage-keys';
export declare const BOOKING_REFERENCE_REGEX: RegExp;
//# sourceMappingURL=index.d.ts.map