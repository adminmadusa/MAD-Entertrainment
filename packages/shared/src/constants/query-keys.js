"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUERY_KEYS = void 0;
const compact = (parts) => parts.filter((part) => part !== undefined);
exports.QUERY_KEYS = {
    public: {
        events: {
            all: ['public-events'],
            list: (filters = {}) => ['public-events', filters],
            featured: () => ['featured-events'],
            detail: (slug) => compact(['public-event', slug]),
            seats: (eventId) => compact(['public-event-seats', eventId]),
        },
        bookings: {
            all: ['public-bookings'],
            detail: (bookingRef) => compact(['public-booking-details', bookingRef]),
            checkout: (bookingId) => compact(['booking-checkout-details', bookingId]),
            mine: () => ['my-bookings'],
        },
        auth: {
            me: () => ['public-auth-me'],
        },
        popups: {
            active: () => ['active-popups'],
        },
        djs: {
            list: () => ['public-dj-operators'],
        },
    },
    admin: {
        analytics: {
            summary: () => ['admin-analytics-summary'],
            revenue: (days) => ['admin-revenue-chart', days],
        },
        bookings: {
            all: ['admin-bookings'],
            list: (filters = {}) => ['admin-bookings', filters],
            detail: (id) => compact(['admin-booking', id]),
        },
        events: {
            all: ['admin-events'],
            list: (filters = {}) => ['admin-events', filters],
            listForSelect: () => ['admin-events-list'],
            detail: (id) => compact(['admin-event', id]),
        },
        refunds: {
            all: ['admin-refunds'],
            list: (filters = {}) => ['admin-refunds', filters],
        },
        notifications: {
            all: ['admin-notifications'],
            list: (filters = {}) => ['admin-notifications', filters],
        },
        diagnostics: {
            consistency: () => ['admin-diagnostics-consistency'],
            reservations: (status) => compact(['admin-diagnostics-reservations', status]),
            webhooks: (filters = {}) => ['admin-diagnostics-webhooks', filters],
            emails: (filters = {}) => ['admin-diagnostics-emails', filters],
        },
        coupons: {
            all: ['admin-coupons'],
            list: (page, active) => compact(['admin-coupons', page, active]),
            detail: (id) => compact(['admin-coupon', id]),
        },
        popups: {
            all: ['admin-popups'],
            list: (page) => compact(['admin-popups', page]),
            detail: (id) => compact(['admin-popup', id]),
        },
        djs: {
            all: ['admin-djs'],
            list: (filters = {}) => ['admin-djs', filters],
            detail: (id) => compact(['admin-dj', id]),
        },
        team: {
            all: ['admin-team'],
            list: (page) => compact(['admin-team', page]),
            me: () => ['admin-profile-me'],
        },
    },
};
//# sourceMappingURL=query-keys.js.map