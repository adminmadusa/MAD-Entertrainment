export * from './constants';
export * from './utils/event-lifecycle';
export * from './utils/booking-eligibility.engine';

export interface BulkOperationResult {
  successCount: number;
  failedCount: number;
  results: {
    id: string;
    status: 'success' | 'failed';
    reason?: string;
  }[];
}
