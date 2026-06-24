import { QueueControlStatus } from '@/lib/api/admin/diagnostics.service';

export interface QueueControlsTabProps {
  queueControls: QueueControlStatus[] | undefined;
  isQueuesLoading: boolean;
  isSuperAdmin: boolean;
  onRefresh: () => void;
  onPause: (name: string) => void;
  onResume: (name: string) => void;
  onDrain: (name: string) => void;
  isPausePending: boolean;
  isResumePending: boolean;
}

export function QueueControlsTab({
  queueControls,
  isQueuesLoading,
  isSuperAdmin,
  onRefresh,
  onPause,
  onResume,
  onDrain,
  isPausePending,
  isResumePending,
}: QueueControlsTabProps) {
  return (
    <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border-subtle">
        <div>
          <h2 className="text-white font-bold text-sm">BullMQ Queue Controls</h2>
          <p className="text-text-muted text-xs mt-0.5">Pause, resume, or drain workers and job queues.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isQueuesLoading}
          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl border border-border-subtle transition-colors"
        >
          {isQueuesLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-text-muted text-left">
              <th className="py-3 px-4 font-medium">Queue Name</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-center">Active</th>
              <th className="py-3 px-4 font-medium text-center">Waiting</th>
              <th className="py-3 px-4 font-medium text-center">Delayed</th>
              <th className="py-3 px-4 font-medium text-center">Completed</th>
              <th className="py-3 px-4 font-medium text-center">Failed</th>
              {isSuperAdmin && <th className="py-3 px-4 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isQueuesLoading ? (
              <tr>
                <td colSpan={isSuperAdmin ? 8 : 7} className="py-10 text-center text-text-muted">
                  Loading queue statuses...
                </td>
              </tr>
            ) : (
              (queueControls ?? []).map((q) => (
                <tr key={q.name} className="border-b border-border-subtle/40 hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-semibold text-white">{q.name}</td>
                  <td className="py-3 px-4">
                    {q.isPaused ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Paused
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-blue-400 font-bold">{q.active}</td>
                  <td className="py-3 px-4 text-center text-yellow-500 font-bold">{q.waiting}</td>
                  <td className="py-3 px-4 text-center text-purple-400">{q.delayed}</td>
                  <td className="py-3 px-4 text-center text-green-400">{q.completed}</td>
                  <td className="py-3 px-4 text-center text-red-500 font-bold">{q.failed}</td>
                  {isSuperAdmin && (
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {q.isPaused ? (
                        <button
                          type="button"
                          onClick={() => onResume(q.name)}
                          disabled={isResumePending}
                          className="px-2 py-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-60"
                        >
                          {isResumePending ? 'Resuming...' : 'Resume'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onPause(q.name)}
                          disabled={isPausePending}
                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-60"
                        >
                          {isPausePending ? 'Pausing...' : 'Pause'}
                        </button>
                      )}
                      {q.name === 'marketing-queue' && (
                        <button
                          type="button"
                          onClick={() => onDrain(q.name)}
                          className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-bold rounded-lg transition-colors"
                        >
                          Drain
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
            {!isQueuesLoading && !queueControls?.length && (
              <tr>
                <td colSpan={isSuperAdmin ? 8 : 7} className="py-10 text-center text-text-muted">
                  No queues found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
