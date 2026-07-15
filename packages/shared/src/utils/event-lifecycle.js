"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveEventLifecycleState = deriveEventLifecycleState;
exports.canBook = canBook;
const constants_1 = require("../constants");
/**
 * Derives the effective lifecycle state of an event based on its administrative status and dates.
 */
function deriveEventLifecycleState(event) {
    const status = event.status;
    // Administrative statuses that override dates
    if (status === constants_1.EventStatus.DRAFT ||
        status === constants_1.EventStatus.CANCELLED ||
        status === constants_1.EventStatus.POSTPONED ||
        status === constants_1.EventStatus.ARCHIVED) {
        return status;
    }
    // If status is PUBLISHED (or COMPLETED as legacy), we calculate based on dates
    const now = new Date().getTime();
    const start = new Date(event.startDate).getTime();
    if (event.endDate) {
        const end = new Date(event.endDate).getTime();
        if (now > end)
            return 'completed';
        if (now >= start && now <= end)
            return 'live';
        return 'upcoming';
    }
    else {
        // If no endDate, we just rely on startDate
        // Technically an event without an endDate doesn't have a defined "live" window,
        // but typically it means it starts and ends roughly around the same time.
        if (now >= start)
            return 'live';
        return 'upcoming';
    }
}
/**
 * Determines if an event is currently bookable based on its derived lifecycle
 * and its specific ticket sales close policy.
 * This is the SINGLE SOURCE OF TRUTH for whether an event accepts bookings.
 */
function canBook(event) {
    const lifecycle = deriveEventLifecycleState(event);
    // Must be in an active lifecycle state to book
    if (lifecycle !== 'upcoming' && lifecycle !== 'live') {
        return false;
    }
    // Check ticket sales close policy
    const now = new Date().getTime();
    const mode = event.ticketSalesCloseMode || 'EVENT_START';
    switch (mode) {
        case 'EVENT_END':
            if (!event.endDate)
                return true;
            return now < new Date(event.endDate).getTime();
        case 'CUSTOM_DATE':
            if (!event.ticketSalesCloseDate)
                return true;
            return now < new Date(event.ticketSalesCloseDate).getTime();
        case 'EVENT_START':
        default:
            if (!event.startDate)
                return true;
            return now < new Date(event.startDate).getTime();
    }
}
//# sourceMappingURL=event-lifecycle.js.map