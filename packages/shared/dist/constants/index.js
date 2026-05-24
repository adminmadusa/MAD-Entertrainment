// ============================================================
// MAD Entertrainment — Shared Constants & Enums
// ============================================================
// ─── Event Categories ────────────────────────────────────────
export var EventCategory;
(function (EventCategory) {
    EventCategory["MAD_EVENT"] = "mad_event";
    EventCategory["DJ_NIGHT"] = "dj_night";
    EventCategory["CONCERT"] = "concert";
    EventCategory["FESTIVAL"] = "festival";
    EventCategory["COMEDY"] = "comedy";
    EventCategory["CELEBRITY"] = "celebrity";
    EventCategory["THEATRE"] = "theatre";
    EventCategory["CINEMA"] = "cinema";
    EventCategory["VIP_EVENT"] = "vip_event";
    EventCategory["LIVE_SHOW"] = "live_show";
})(EventCategory || (EventCategory = {}));
// ─── Booking Mode ────────────────────────────────────────────
export var BookingMode;
(function (BookingMode) {
    BookingMode["SEAT_BASED"] = "seat_based";
    BookingMode["GENERAL_ADMISSION"] = "general_admission";
})(BookingMode || (BookingMode = {}));
// ─── Event Status ────────────────────────────────────────────
export var EventStatus;
(function (EventStatus) {
    EventStatus["DRAFT"] = "draft";
    EventStatus["PUBLISHED"] = "published";
    EventStatus["CANCELLED"] = "cancelled";
    EventStatus["POSTPONED"] = "postponed";
    EventStatus["COMPLETED"] = "completed";
    EventStatus["SOLD_OUT"] = "sold_out";
})(EventStatus || (EventStatus = {}));
// ─── Booking Status ──────────────────────────────────────────
export var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "pending";
    BookingStatus["CONFIRMED"] = "confirmed";
    BookingStatus["CANCELLED"] = "cancelled";
    BookingStatus["REFUNDED"] = "refunded";
    BookingStatus["FAILED"] = "failed";
    BookingStatus["AWAITING_PAYMENT"] = "awaiting_payment";
})(BookingStatus || (BookingStatus = {}));
// ─── Payment Status ──────────────────────────────────────────
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["PAID"] = "paid";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["CANCELLED"] = "cancelled";
    PaymentStatus["PARTIALLY_REFUNDED"] = "partially_refunded";
})(PaymentStatus || (PaymentStatus = {}));
// ─── Payment Gateway ─────────────────────────────────────────
export var PaymentGateway;
(function (PaymentGateway) {
    PaymentGateway["RAZORPAY"] = "razorpay";
    PaymentGateway["STRIPE"] = "stripe";
})(PaymentGateway || (PaymentGateway = {}));
// ─── Payment Method ──────────────────────────────────────────
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["UPI"] = "upi";
    PaymentMethod["CARD"] = "card";
    PaymentMethod["NET_BANKING"] = "net_banking";
    PaymentMethod["WALLET"] = "wallet";
    PaymentMethod["STRIPE_CARD"] = "stripe_card";
})(PaymentMethod || (PaymentMethod = {}));
// ─── Ticket Tier ─────────────────────────────────────────────
export var TicketTier;
(function (TicketTier) {
    TicketTier["GENERAL"] = "general";
    TicketTier["SILVER"] = "silver";
    TicketTier["GOLD"] = "gold";
    TicketTier["VIP"] = "vip";
    TicketTier["VVIP"] = "vvip";
    TicketTier["PLATINUM"] = "platinum";
    TicketTier["BACKSTAGE"] = "backstage";
    TicketTier["COUPLE"] = "couple";
    TicketTier["GROUP"] = "group";
    TicketTier["FAMILY"] = "family";
    TicketTier["EARLY_BIRD"] = "early_bird";
    TicketTier["CUSTOM"] = "custom";
})(TicketTier || (TicketTier = {}));
// ─── Event Mode ──────────────────────────────────────────────
export var EventMode;
(function (EventMode) {
    EventMode["LIVE"] = "live";
    EventMode["ONLINE"] = "online";
    EventMode["HYBRID"] = "hybrid";
})(EventMode || (EventMode = {}));
// ─── Seat Status ─────────────────────────────────────────────
export var SeatStatus;
(function (SeatStatus) {
    SeatStatus["AVAILABLE"] = "available";
    SeatStatus["LOCKED"] = "locked";
    SeatStatus["BOOKED"] = "booked";
    SeatStatus["BLOCKED"] = "blocked";
    SeatStatus["WHEELCHAIR"] = "wheelchair";
})(SeatStatus || (SeatStatus = {}));
// ─── Admin Role ──────────────────────────────────────────────
export var AdminRole;
(function (AdminRole) {
    AdminRole["SUPER_ADMIN"] = "super_admin";
    AdminRole["ADMIN"] = "admin";
    AdminRole["MANAGER"] = "manager";
    AdminRole["SUPPORT"] = "support";
    AdminRole["SCANNER"] = "scanner";
})(AdminRole || (AdminRole = {}));
// ─── Refund Status ───────────────────────────────────────────
export var RefundStatus;
(function (RefundStatus) {
    RefundStatus["REQUESTED"] = "requested";
    RefundStatus["PROCESSING"] = "processing";
    RefundStatus["COMPLETED"] = "completed";
    RefundStatus["REJECTED"] = "rejected";
    RefundStatus["FAILED"] = "failed";
})(RefundStatus || (RefundStatus = {}));
// ─── Popup Trigger ───────────────────────────────────────────
export var PopupTrigger;
(function (PopupTrigger) {
    PopupTrigger["ON_LOAD"] = "on_load";
    PopupTrigger["ON_EXIT"] = "on_exit";
    PopupTrigger["AFTER_DELAY"] = "after_delay";
    PopupTrigger["ON_SCROLL"] = "on_scroll";
})(PopupTrigger || (PopupTrigger = {}));
// ─── Notification Type ───────────────────────────────────────
export var NotificationType;
(function (NotificationType) {
    NotificationType["BOOKING_CONFIRMED"] = "booking_confirmed";
    NotificationType["PAYMENT_FAILED"] = "payment_failed";
    NotificationType["REFUND_PROCESSED"] = "refund_processed";
    NotificationType["EVENT_REMINDER"] = "event_reminder";
    NotificationType["EVENT_CANCELLED"] = "event_cancelled";
    NotificationType["EVENT_UPDATED"] = "event_updated";
    NotificationType["OTP"] = "otp";
})(NotificationType || (NotificationType = {}));
// ─── HTTP Status Codes ───────────────────────────────────────
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
};
// ─── Seat Lock Duration ──────────────────────────────────────
export const SEAT_LOCK_TTL_SECONDS = 10 * 60; // 10 minutes
// ─── Max Tickets Per Booking ─────────────────────────────────
export const MAX_TICKETS_PER_BOOKING = 10;
// ─── Popup Cooldown ──────────────────────────────────────────
export const POPUP_COOLDOWN_HOURS = 24;
export const POPUP_SESSION_KEY_PREFIX = 'mad_popup_';
// ─── API Routes ──────────────────────────────────────────────
export const API_ROUTES = {
    HEALTH: '/api/health',
    EVENTS: '/api/events',
    BOOKINGS: '/api/bookings',
    PAYMENTS: '/api/payments',
    USERS: '/api/users',
    AUTH: '/api/auth',
    ADMIN: '/api/admin',
    VENUES: '/api/venues',
    ARTISTS: '/api/artists',
    DJ_OPERATORS: '/api/dj-operators',
    COUPONS: '/api/coupons',
    POPUP_CAMPAIGNS: '/api/popup-campaigns',
    TICKETS: '/api/tickets',
    NOTIFICATIONS: '/api/notifications',
    ANALYTICS: '/api/analytics',
    MEDIA: '/api/media',
};
// ─── Currency ────────────────────────────────────────────────
export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'GBP', 'EUR'];
// ─── Event Category Labels ───────────────────────────────────
export const EVENT_CATEGORY_LABELS = {
    [EventCategory.MAD_EVENT]: 'MAD Event',
    [EventCategory.DJ_NIGHT]: 'DJ Night',
    [EventCategory.CONCERT]: 'Concert',
    [EventCategory.FESTIVAL]: 'Festival',
    [EventCategory.COMEDY]: 'Comedy Show',
    [EventCategory.CELEBRITY]: 'Celebrity Event',
    [EventCategory.THEATRE]: 'Theatre',
    [EventCategory.CINEMA]: 'Cinema',
    [EventCategory.VIP_EVENT]: 'VIP Event',
    [EventCategory.LIVE_SHOW]: 'Live Show',
};
// ─── LocalStorage Keys ───────────────────────────────────────
export * from './storage-keys';
//# sourceMappingURL=index.js.map