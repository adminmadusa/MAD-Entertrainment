export * from './constants';
export * from './utils/event-lifecycle';
export interface BulkOperationResult {
    successCount: number;
    failedCount: number;
    results: {
        id: string;
        status: 'success' | 'failed';
        reason?: string;
    }[];
}
//# sourceMappingURL=index.d.ts.map