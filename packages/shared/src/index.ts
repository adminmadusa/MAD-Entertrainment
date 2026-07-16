export * from './constants';
export * from './utils/event-lifecycle';
export * from './utils/booking-lifecycle';
export * from './utils/map-link';
export type {
  BaseEventForBooking,
  EventBookingCTA,
  EventBookingState
} from './utils/booking-eligibility.engine';
export { deriveBookingEligibility } from './utils/booking-eligibility.engine';

export interface BulkOperationResult {
  successCount: number;
  failedCount: number;
  results: {
    id: string;
    status: 'success' | 'failed';
    reason?: string;
  }[];
}
