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
    COMPLETED = "completed",
    SOLD_OUT = "sold_out"
}
export declare enum BookingStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    CANCELLED = "cancelled",
    REFUNDED = "refunded",
    FAILED = "failed",
    AWAITING_PAYMENT = "awaiting_payment"
}
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
    EVENT_REMINDER = "event_reminder",
    EVENT_CANCELLED = "event_cancelled",
    EVENT_UPDATED = "event_updated",
    OTP = "otp"
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
    readonly VENUES: "/api/venues";
    readonly ARTISTS: "/api/artists";
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
//# sourceMappingURL=index.d.ts.map