export * from './constants';

export interface BulkOperationResult {
  successCount: number;
  failedCount: number;
  results: {
    id: string;
    status: 'success' | 'failed';
    reason?: string;
  }[];
}
