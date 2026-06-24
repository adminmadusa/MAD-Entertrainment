import { DeadLetterJobDetails } from '@/lib/api/admin/diagnostics.service';

export interface DlqInspectorDrawerProps {
  inspectingJobId: string;
  inspectedJob: DeadLetterJobDetails | null;
  isInspectLoading: boolean;
  inspectError: string | null;
  isSuperAdmin: boolean;
  onClose: () => void;
  onRetryJob: (job: DeadLetterJobDetails) => void;
  onCopyPayload: () => void;
}

export function DlqInspectorDrawer({
  inspectingJobId,
  inspectedJob,
  isInspectLoading,
  inspectError,
  isSuperAdmin,
  onClose,
  onRetryJob,
  onCopyPayload,
}: DlqInspectorDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-2xl bg-background-card border-l border-border-subtle h-full shadow-2xl flex flex-col animate-slide-in">
        {/* Drawer Header */}
        <div className="p-6 border-b border-border-subtle flex items-center justify-between bg-white/[0.01]">
          <div>
            <h3 className="text-lg font-black text-white">Inspect Job Payload</h3>
            <p className="text-xs text-text-muted mt-0.5">Decrypting and inspecting raw transaction payloads.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-text-secondary hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isInspectLoading && (
            <div className="text-center py-12 text-xs text-text-muted">
              Decrypting payload on-demand... Please wait.
            </div>
          )}

          {inspectError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
              {inspectError}
            </div>
          )}

          {inspectedJob && (
            <div className="space-y-4">
              {/* Job Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-border-subtle">
                <div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">Queue Name</div>
                  <div className="text-xs text-white font-semibold mt-1">{inspectedJob.queueName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">Job Name</div>
                  <div className="text-xs text-white font-semibold mt-1">{inspectedJob.jobName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">Job ID</div>
                  <div className="text-xs font-mono text-accent-purple-light mt-1">{inspectedJob.jobId}</div>
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">Attempts Made</div>
                  <div className="text-xs text-white font-semibold mt-1">{inspectedJob.attemptsMade}</div>
                </div>
              </div>

              {/* Decrypted Payload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">Decrypted Data Payload</div>
                  <button
                    onClick={onCopyPayload}
                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-[10px] transition-colors"
                  >
                    Copy JSON
                  </button>
                </div>
                <pre className="p-4 bg-black rounded-xl border border-border-subtle overflow-auto text-xs font-mono text-green-400 max-h-72">
                  {JSON.stringify(inspectedJob.data, null, 2)}
                </pre>
              </div>

              {/* Stacktrace */}
              {inspectedJob.stacktrace && inspectedJob.stacktrace.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">Exception Stacktrace</div>
                  <pre className="p-4 bg-black rounded-xl border border-border-subtle overflow-auto text-[10px] font-mono text-red-300 max-h-48 whitespace-pre-wrap">
                    {inspectedJob.stacktrace.join('\n')}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-6 border-t border-border-subtle bg-white/[0.01] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs rounded-xl border border-border-subtle transition-colors"
          >
            Close Inspector
          </button>
          {isSuperAdmin && inspectedJob && (
            <button
              onClick={() => onRetryJob(inspectedJob)}
              className="px-4 py-2 bg-accent-purple text-white font-semibold text-xs rounded-xl hover:bg-accent-purple-dark transition-colors"
            >
              Retry Job
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
