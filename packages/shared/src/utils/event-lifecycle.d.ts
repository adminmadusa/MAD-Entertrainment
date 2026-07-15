export type EventLifecycleState = 'draft' | 'upcoming' | 'live' | 'completed' | 'cancelled' | 'archived' | 'postponed';
export interface BaseEventForLifecycle {
    status: string;
    startDate: Date | string;
    endDate?: Date | string | null;
    ticketSalesCloseMode?: string;
    ticketSalesCloseDate?: Date | string | null;
}
/**
 * Derives the effective lifecycle state of an event based on its administrative status and dates.
 */
export declare function deriveEventLifecycleState(event: BaseEventForLifecycle): EventLifecycleState;
/**
 * Determines if an event is currently bookable based on its derived lifecycle
 * and its specific ticket sales close policy.
 * This is the SINGLE SOURCE OF TRUTH for whether an event accepts bookings.
 */
export declare function canBook(event: BaseEventForLifecycle): boolean;
//# sourceMappingURL=event-lifecycle.d.ts.map