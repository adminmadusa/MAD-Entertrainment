"use strict";
// ============================================================
// MAD Entertrainment — Shared Constants & Enums
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOOKING_REFERENCE_REGEX = exports.EVENT_CATEGORY_LABELS = exports.SUPPORTED_CURRENCIES = exports.API_ROUTES = exports.POPUP_SESSION_KEY_PREFIX = exports.POPUP_COOLDOWN_HOURS = exports.MAX_MEMORIES_GALLERY_LIMIT = exports.DEFAULT_MEMORIES_GALLERY_LIMIT = exports.EventMemoryPublicationState = exports.MAX_TICKETS_PER_BOOKING = exports.SEAT_LOCK_TTL_SECONDS = exports.HTTP_STATUS = exports.NotificationType = exports.PopupTrigger = exports.RefundStatus = exports.AdminRole = exports.SeatStatus = exports.EventMode = exports.TicketTier = exports.TicketSalesCloseMode = exports.PaymentMethod = exports.PaymentGateway = exports.InventoryState = exports.ReservationStatus = exports.PaymentStatus = exports.BOOKING_STATUS_META = exports.BookingStatus = exports.EVENT_STATUS_METADATA = exports.EVENT_DUPLICATION_POLICY = exports.EVENT_STATUS_TRANSITIONS = exports.EventStatus = exports.BookingMode = exports.EventCategory = void 0;
exports.getBookingStatusMeta = getBookingStatusMeta;
exports.getBookingStatusLabel = getBookingStatusLabel;
exports.getBookingStatusTone = getBookingStatusTone;
__exportStar(require("./query-keys"), exports);
__exportStar(require("./storage-keys"), exports);
// ─── Event Categories ────────────────────────────────────────
var EventCategory;
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
})(EventCategory || (exports.EventCategory = EventCategory = {}));
// ─── Booking Mode ────────────────────────────────────────────
var BookingMode;
(function (BookingMode) {
    BookingMode["SEAT_BASED"] = "seat_based";
    BookingMode["GENERAL_ADMISSION"] = "general_admission";
})(BookingMode || (exports.BookingMode = BookingMode = {}));
// ─── Event Status ────────────────────────────────────────────
var EventStatus;
(function (EventStatus) {
    EventStatus["DRAFT"] = "draft";
    EventStatus["PUBLISHED"] = "published";
    EventStatus["CANCELLED"] = "cancelled";
    EventStatus["POSTPONED"] = "postponed";
    EventStatus["COMPLETED"] = "completed";
    EventStatus["ARCHIVED"] = "archived";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
exports.EVENT_STATUS_TRANSITIONS = {
    [EventStatus.DRAFT]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
    [EventStatus.PUBLISHED]: [EventStatus.POSTPONED, EventStatus.COMPLETED, EventStatus.ARCHIVED, EventStatus.CANCELLED],
    [EventStatus.POSTPONED]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
    [EventStatus.COMPLETED]: [EventStatus.ARCHIVED],
    [EventStatus.ARCHIVED]: [],
    [EventStatus.CANCELLED]: [],
};
// ─── Event Duplication Policy ────────────────────────────────
exports.EVENT_DUPLICATION_POLICY = {
    copied: [
        'title', // Title is copied but modified by naming strategy
        'description',
        'category',
        'bookingMode',
        'bannerImage',
        'posterImage',
        'galleryImages',
        'startDate',
        'endDate',
        'doorsOpenTime',
        'showTime',
        'venue',
        'djOperatorIds',
        'ticketTiers',
    ],
    reset: [
        '_id',
        'slug',
        'createdAt',
        'updatedAt',
        'eventVersion',
    ],
    regenerated: [
        'status', // Defaults to DRAFT
    ]
};
exports.EVENT_STATUS_METADATA = {
    [EventStatus.DRAFT]: {
        label: 'Draft',
        tone: 'warning',
        className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    },
    [EventStatus.PUBLISHED]: {
        label: 'Published',
        tone: 'success',
        className: 'bg-green-500/10 text-green-400 border-green-500/30',
    },
    [EventStatus.POSTPONED]: {
        label: 'Postponed',
        tone: 'warning',
        className: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    },
    [EventStatus.COMPLETED]: {
        label: 'Completed',
        tone: 'info',
        className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    },
    [EventStatus.CANCELLED]: {
        label: 'Cancelled',
        tone: 'danger',
        className: 'bg-red-500/10 text-red-400 border-red-500/30',
    },
    [EventStatus.ARCHIVED]: {
        label: 'Archived',
        tone: 'neutral',
        className: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    },
};
// ─── Booking Status ──────────────────────────────────────────
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "pending";
    BookingStatus["CONFIRMED"] = "confirmed";
    BookingStatus["CANCELLED"] = "cancelled";
    BookingStatus["REFUNDED"] = "refunded";
    BookingStatus["FAILED"] = "failed";
    BookingStatus["AWAITING_PAYMENT"] = "awaiting_payment";
    BookingStatus["EXPIRED"] = "expired";
    BookingStatus["EXPIRING"] = "expiring";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
exports.BOOKING_STATUS_META = {
    [BookingStatus.AWAITING_PAYMENT]: {
        label: 'Awaiting Payment',
        tone: 'warning',
    },
    [BookingStatus.EXPIRING]: {
        label: 'Processing',
        tone: 'processing',
    },
    [BookingStatus.FAILED]: {
        label: 'Payment Failed',
        tone: 'danger',
    },
    [BookingStatus.CANCELLED]: {
        label: 'Cancelled',
        tone: 'danger',
    },
    [BookingStatus.REFUNDED]: {
        label: 'Refunded',
        tone: 'refund',
    },
    [BookingStatus.EXPIRED]: {
        label: 'Expired',
        tone: 'neutral',
    },
    [BookingStatus.CONFIRMED]: {
        label: 'Confirmed',
        tone: 'success',
    },
    [BookingStatus.PENDING]: {
        label: 'Pending',
        tone: 'warning',
    },
};
function toDisplayLabel(status) {
    return status
        .replace(/[_-]+/g, ' ')
        .trim()
        .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}
function getBookingStatusMeta(status) {
    if (status && Object.prototype.hasOwnProperty.call(exports.BOOKING_STATUS_META, status)) {
        return exports.BOOKING_STATUS_META[status];
    }
    return {
        label: status ? toDisplayLabel(status) : 'Unknown',
        tone: 'neutral',
    };
}
function getBookingStatusLabel(status) {
    return getBookingStatusMeta(status).label;
}
function getBookingStatusTone(status) {
    return getBookingStatusMeta(status).tone;
}
// ─── Payment Status ──────────────────────────────────────────
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["PAID"] = "paid";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["CANCELLED"] = "cancelled";
    PaymentStatus["PARTIALLY_REFUNDED"] = "partially_refunded";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
// ─── Reservation Status ──────────────────────────────────────
var ReservationStatus;
(function (ReservationStatus) {
    ReservationStatus["RESERVED"] = "reserved";
    ReservationStatus["PENDING_PAYMENT"] = "pending_payment";
    ReservationStatus["CONFIRMED"] = "confirmed";
    ReservationStatus["EXPIRED"] = "expired";
    ReservationStatus["CANCELLED"] = "cancelled";
    ReservationStatus["FAILED"] = "failed";
    ReservationStatus["REFUNDED"] = "refunded";
})(ReservationStatus || (exports.ReservationStatus = ReservationStatus = {}));
// ─── Inventory State ─────────────────────────────────────────
var InventoryState;
(function (InventoryState) {
    InventoryState["AVAILABLE"] = "available";
    InventoryState["RESERVED"] = "reserved";
    InventoryState["PENDING_PAYMENT"] = "pending_payment";
    InventoryState["BOOKED"] = "booked";
    InventoryState["EXPIRED"] = "expired";
    InventoryState["FAILED"] = "failed";
    InventoryState["REFUNDED"] = "refunded";
    InventoryState["CANCELLED"] = "cancelled";
})(InventoryState || (exports.InventoryState = InventoryState = {}));
// ─── Payment Gateway ─────────────────────────────────────────
var PaymentGateway;
(function (PaymentGateway) {
    PaymentGateway["RAZORPAY"] = "razorpay";
    PaymentGateway["STRIPE"] = "stripe";
})(PaymentGateway || (exports.PaymentGateway = PaymentGateway = {}));
// ─── Payment Method ──────────────────────────────────────────
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["UPI"] = "upi";
    PaymentMethod["CARD"] = "card";
    PaymentMethod["NET_BANKING"] = "net_banking";
    PaymentMethod["WALLET"] = "wallet";
    PaymentMethod["STRIPE_CARD"] = "stripe_card";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
// ─── Ticket Sales Close Mode ─────────────────────────────────
var TicketSalesCloseMode;
(function (TicketSalesCloseMode) {
    TicketSalesCloseMode["EVENT_START"] = "EVENT_START";
    TicketSalesCloseMode["EVENT_END"] = "EVENT_END";
    TicketSalesCloseMode["CUSTOM_DATE"] = "CUSTOM_DATE";
})(TicketSalesCloseMode || (exports.TicketSalesCloseMode = TicketSalesCloseMode = {}));
// ─── Ticket Tier ─────────────────────────────────────────────
var TicketTier;
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
})(TicketTier || (exports.TicketTier = TicketTier = {}));
// ─── Event Mode ──────────────────────────────────────────────
var EventMode;
(function (EventMode) {
    EventMode["LIVE"] = "live";
    EventMode["ONLINE"] = "online";
    EventMode["HYBRID"] = "hybrid";
})(EventMode || (exports.EventMode = EventMode = {}));
// ─── Seat Status ─────────────────────────────────────────────
var SeatStatus;
(function (SeatStatus) {
    SeatStatus["AVAILABLE"] = "available";
    SeatStatus["LOCKED"] = "locked";
    SeatStatus["BOOKED"] = "booked";
    SeatStatus["BLOCKED"] = "blocked";
    SeatStatus["WHEELCHAIR"] = "wheelchair";
})(SeatStatus || (exports.SeatStatus = SeatStatus = {}));
// ─── Admin Role ──────────────────────────────────────────────
var AdminRole;
(function (AdminRole) {
    AdminRole["SUPER_ADMIN"] = "super_admin";
    AdminRole["ADMIN"] = "admin";
    AdminRole["MANAGER"] = "manager";
    AdminRole["SUPPORT"] = "support";
    AdminRole["SCANNER"] = "scanner";
})(AdminRole || (exports.AdminRole = AdminRole = {}));
// ─── Refund Status ───────────────────────────────────────────
var RefundStatus;
(function (RefundStatus) {
    RefundStatus["REQUESTED"] = "requested";
    RefundStatus["PROCESSING"] = "processing";
    RefundStatus["COMPLETED"] = "completed";
    RefundStatus["REJECTED"] = "rejected";
    RefundStatus["FAILED"] = "failed";
})(RefundStatus || (exports.RefundStatus = RefundStatus = {}));
// ─── Popup Trigger ───────────────────────────────────────────
var PopupTrigger;
(function (PopupTrigger) {
    PopupTrigger["ON_LOAD"] = "on_load";
    PopupTrigger["ON_EXIT"] = "on_exit";
    PopupTrigger["AFTER_DELAY"] = "after_delay";
    PopupTrigger["ON_SCROLL"] = "on_scroll";
})(PopupTrigger || (exports.PopupTrigger = PopupTrigger = {}));
// ─── Notification Type ───────────────────────────────────────
var NotificationType;
(function (NotificationType) {
    NotificationType["BOOKING_CONFIRMED"] = "booking_confirmed";
    NotificationType["PAYMENT_FAILED"] = "payment_failed";
    NotificationType["REFUND_PROCESSED"] = "refund_processed";
    NotificationType["FULL_REFUND"] = "full_refund";
    NotificationType["PARTIAL_REFUND"] = "partial_refund";
    NotificationType["EVENT_REMINDER"] = "event_reminder";
    NotificationType["EVENT_CANCELLED"] = "event_cancelled";
    NotificationType["EVENT_UPDATED"] = "event_updated";
    NotificationType["OTP"] = "otp";
    NotificationType["MARKETING"] = "marketing";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
// ─── HTTP Status Codes ───────────────────────────────────────
exports.HTTP_STATUS = {
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
exports.SEAT_LOCK_TTL_SECONDS = 10 * 60; // 10 minutes
// ─── Max Tickets Per Booking ─────────────────────────────────
exports.MAX_TICKETS_PER_BOOKING = 10;
// ─── Event Memory Publication State ──────────────────────────
var EventMemoryPublicationState;
(function (EventMemoryPublicationState) {
    EventMemoryPublicationState["DRAFT"] = "DRAFT";
    EventMemoryPublicationState["PREVIEW"] = "PREVIEW";
    EventMemoryPublicationState["PUBLISHED"] = "PUBLISHED";
    EventMemoryPublicationState["HIDDEN"] = "HIDDEN";
})(EventMemoryPublicationState || (exports.EventMemoryPublicationState = EventMemoryPublicationState = {}));
// ─── Event Memory Gallery Limits ──────────────────────────────
exports.DEFAULT_MEMORIES_GALLERY_LIMIT = 30;
exports.MAX_MEMORIES_GALLERY_LIMIT = 50;
// ─── Popup Cooldown ──────────────────────────────────────────
exports.POPUP_COOLDOWN_HOURS = 24;
exports.POPUP_SESSION_KEY_PREFIX = 'mad_popup_';
// ─── API Routes ──────────────────────────────────────────────
exports.API_ROUTES = {
    HEALTH: '/api/health',
    EVENTS: '/api/events',
    BOOKINGS: '/api/bookings',
    PAYMENTS: '/api/payments',
    USERS: '/api/users',
    AUTH: '/api/auth',
    ADMIN: '/api/admin',
    DJ_OPERATORS: '/api/dj-operators',
    COUPONS: '/api/coupons',
    POPUP_CAMPAIGNS: '/api/popup-campaigns',
    TICKETS: '/api/tickets',
    NOTIFICATIONS: '/api/notifications',
    ANALYTICS: '/api/analytics',
    MEDIA: '/api/media',
};
// ─── Currency ────────────────────────────────────────────────
exports.SUPPORTED_CURRENCIES = ['INR', 'USD', 'GBP', 'EUR'];
// ─── Event Category Labels ───────────────────────────────────
exports.EVENT_CATEGORY_LABELS = {
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
__exportStar(require("./storage-keys"), exports);
// ─── Booking Reference ───────────────────────────────────────
exports.BOOKING_REFERENCE_REGEX = /^MAD-\d{4}-[A-Z0-9]{5}$/;
//# sourceMappingURL=index.js.map