import { DeadLetterJobMetadata, DlqPaginatedResponse } from '@/lib/api/admin/diagnostics.service';
import { formatDateTime } from '@mad/utils';

export interface DeadLetterQueueTabProps {
  dlqResponse: DlqPaginatedResponse | undefined;
  isDlqLoading: boolean;
  dlqCount: number;
  isDlqBulkReplayBlocked: boolean;
  isSuperAdmin: boolean;
  dlqSearch: string;
  onSearchChange: (search: string) => void;
  dlqQueue: string;
  onQueueChange: (queue: string) => void;
  dlqPage: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onInspect: (id: string) => void;
  onRetry: (job: DeadLetterJobMetadata) => void;
  onRetryAll: () => void;
  isRetryAllPending: boolean;
}

export function DeadLetterQueueTab({
  dlqResponse,
  isDlqLoading,
  dlqCount,
  isDlqBulkReplayBlocked,
  isSuperAdmin,
  dlqSearch,
  onSearchChange,
  dlqQueue,
  onQueueChange,
  dlqPage,
  onPageChange,
  onRefresh,
  onInspect,
  onRetry,
  onRetryAll,
  isRetryAllPending,
}: DeadLetterQueueTabProps) {
  return (
    <div className="space-y-4">
      {/* Filters & Bulk Operations */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-border-subtle">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search job ID or Name..."
            value={dlqSearch}
            onChange={(event) => {
              onSearchChange(event.target.value);
              onPageChange(1);
            }}
            className="px-3 py-2 rounded-xl bg-background-card border border-border-subtle text-xs text-text-primary placeholder:text-text-muted w-full sm:w-48 outline-none focus:border-accent-purple"
          />
          <select
            value={dlqQueue}
            onChange={(event) => {
              onQueueChange(event.target.value);
              onPageChange(1);
            }}
            className="px-3 py-2 rounded-xl bg-background-card border border-border-subtle text-xs text-text-primary outline-none"
          >
            <option value="">All Queues</option>
            <option value="booking-queue">Booking Queue</option>
            <option value="pdf-queue">PDF Queue</option>
            <option value="notification-queue">Notification Queue</option>
            <option value="marketing-queue">Marketing Queue</option>
          </select>
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs border border-border-subtle transition-colors"
            title="Refresh Logs"
          >
            🔄
          </button>
        </div>

        {isSuperAdmin && dlqCount > 0 && (
          <div>
            <button
              type="button"
              onClick={onRetryAll}
              className={`px-4 py-2 text-xs font-semibold rounded-xl text-white transition-opacity ${
                isDlqBulkReplayBlocked
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              disabled={isDlqBulkReplayBlocked || isRetryAllPending}
            >
              {isRetryAllPending ? 'Replaying...' : 'Replay All Failed'}
            </button>
          </div>
        )}
      </div>

      {/* Safety Warnings */}
      {isDlqBulkReplayBlocked && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
          <span>⚠️</span>
          <span>
            <strong>Bulk replay blocked:</strong> Total DLQ jobs count ({dlqCount}) exceeds the safety limit of 50.
            Please inspect and retry jobs individually.
          </span>
        </div>
      )}

      {/* DLQ Table */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted text-left">
                <th className="py-3 px-4 font-medium">Queue Name</th>
                <th className="py-3 px-4 font-medium">Job ID</th>
                <th className="py-3 px-4 font-medium">Job Name</th>
                <th className="py-3 px-4 font-medium text-center">Attempts</th>
                <th className="py-3 px-4 font-medium">Failure Reason</th>
                <th className="py-3 px-4 font-medium">Failed Date</th>
                {isSuperAdmin && <th className="py-3 px-4 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {(dlqResponse?.data ?? []).map((job) => (
                <tr key={job._id} className="border-b border-border-subtle/40 hover:bg-white/[0.01]">
                  <td className="py-3 px-4 font-semibold text-white">{job.queueName}</td>
                  <td className="py-3 px-4 font-mono text-accent-purple-light">{job.jobId}</td>
                  <td className="py-3 px-4 text-text-secondary">{job.jobName}</td>
                  <td className="py-3 px-4 text-center font-bold text-text-primary">{job.attemptsMade}</td>
                  <td className="py-3 px-4 text-red-400 max-w-xs truncate" title={job.failedReason}>
                    {job.failedReason || 'Unknown error'}
                  </td>
                  <td className="py-3 px-4 text-text-muted">{formatDateTime(job.processedAt)}</td>
                  {isSuperAdmin && (
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => onInspect(job._id)}
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white text-[10px] font-medium rounded-lg border border-border-subtle transition-colors"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => onRetry(job)}
                        className="px-2 py-1 bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple-light text-[10px] font-semibold rounded-lg border border-accent-purple/40 transition-colors"
                      >
                        Retry
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!dlqResponse?.data?.length && !isDlqLoading && (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="py-12 text-center text-text-muted">
                    No dead letter queue jobs recorded. System is healthy!
                  </td>
                </tr>
              )}
              {isDlqLoading && (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="py-12 text-center text-text-muted">
                    Fetching DLQ data...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {dlqResponse && dlqResponse.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-white/[0.01] text-xs">
            <span className="text-text-muted">
              Showing Page {dlqResponse.pagination.page} of {dlqResponse.pagination.totalPages} ({dlqResponse.pagination.total} total items)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(Math.max(dlqPage - 1, 1))}
                disabled={dlqPage === 1}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-40 disabled:hover:bg-white/5 transition-colors border border-border-subtle"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(Math.min(dlqPage + 1, dlqResponse.pagination.totalPages))}
                disabled={dlqPage === dlqResponse.pagination.totalPages}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-40 disabled:hover:bg-white/5 transition-colors border border-border-subtle"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
