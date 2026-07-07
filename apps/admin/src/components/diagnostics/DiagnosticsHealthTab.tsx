import { ConsistencyReport, SystemHealthReport } from '@/lib/api/admin/diagnostics.service';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@mad/ui';

export interface DiagnosticsHealthTabProps {
  health: SystemHealthReport | undefined;
  report: ConsistencyReport | undefined;
  isHealthLoading: boolean;
}

export function DiagnosticsHealthTab({
  health,
  report,
  isHealthLoading,
}: DiagnosticsHealthTabProps) {
  return (
    <div className="space-y-6">
      {/* Health Status Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl border border-border-subtle p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">Database Engine</div>
            <div className="text-lg font-black text-white mt-1">MongoDB Atlas</div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                health?.database?.state === 'connected'
                  ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-text-secondary capitalize">{health?.database?.state || 'checking'}</span>
          </div>
        </div>

        <div className="glass rounded-xl border border-border-subtle p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">In-Memory Cache</div>
            <div className="text-lg font-black text-white mt-1">Redis Datastore</div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                health?.redis?.connected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-text-secondary">{health?.redis?.connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        <div className="glass rounded-xl border border-border-subtle p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">Real-time Sockets</div>
            <div className="text-lg font-black text-white mt-1">Socket.io Engine</div>
          </div>
          <div className="text-xs text-text-secondary text-right">
            <div>Connected: {health?.sockets?.connectedClients ?? 0} clients</div>
            <div className="text-[10px] text-text-muted">Admin connections: {health?.sockets?.adminClients ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Queue Statistics */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <div className="p-4 border-b border-border-subtle">
          <h2 className="text-white font-bold text-sm">Async Worker Queues (BullMQ)</h2>
          <p className="text-text-muted text-xs mt-0.5">Metrics from active background job processors.</p>
        </div>
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="text-left text-text-muted">
              <TableHead className="py-3 px-4 font-medium">Queue Name</TableHead>
              <TableHead className="py-3 px-4 font-medium text-center">Active</TableHead>
              <TableHead className="py-3 px-4 font-medium text-center">Waiting</TableHead>
              <TableHead className="py-3 px-4 font-medium text-center">Delayed</TableHead>
              <TableHead className="py-3 px-4 font-medium text-center">Completed</TableHead>
              <TableHead className="py-3 px-4 font-medium text-center">Failed</TableHead>
              <TableHead className="py-3 px-4 font-medium text-right">Oldest Job Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {health?.queues?.map((q) => (
              <TableRow key={q.name} className="border-b border-border-subtle/40 hover:bg-white/[0.02]">
                <TableCell className="py-3 px-4 font-semibold text-white">{q.name}</TableCell>
                <TableCell className="py-3 px-4 text-center text-blue-400 font-bold">{q.active}</TableCell>
                <TableCell className="py-3 px-4 text-center text-yellow-500 font-bold">{q.waiting}</TableCell>
                <TableCell className="py-3 px-4 text-center text-purple-400">{q.delayed}</TableCell>
                <TableCell className="py-3 px-4 text-center text-green-400">{q.completed}</TableCell>
                <TableCell className="py-3 px-4 text-center text-red-500 font-bold">{q.failed}</TableCell>
                <TableCell className="py-3 px-4 text-right text-text-secondary">
                  {q.oldestWaitingJobAgeMs > 0 ? `${(q.oldestWaitingJobAgeMs / 1000).toFixed(1)}s` : '—'}
                </TableCell>
              </TableRow>
            ))}
            {isHealthLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-text-muted">
                  Loading queue health statistics...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Consistency report watchdog stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-xl border border-border-subtle p-4">
          <div className="font-bold text-white text-xs mb-3">Self-Healing Watchdog Counts</div>
          <div className="grid grid-cols-3 gap-2">
            {report &&
              Object.entries(report.counts).map(([label, value]) => (
                <div key={label} className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="text-[9px] uppercase tracking-wider text-text-muted truncate">
                    {label.replace(/([A-Z])/g, ' $1')}
                  </div>
                  <div className="text-lg font-black text-white mt-1">{value}</div>
                </div>
              ))}
          </div>
        </div>

        <div className="glass rounded-xl border border-border-subtle p-4">
          <div className="font-bold text-white text-xs mb-3">Active Inventory Drift Status</div>
          <div className="grid grid-cols-3 gap-2">
            {report &&
              Object.entries(report.drift).map(([label, value]) => (
                <div
                  key={label}
                  className={`p-3 rounded-lg border ${
                    value > 0 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-green-500/10 border-green-500/20'
                  }`}
                >
                  <div className="text-[9px] uppercase tracking-wider text-text-muted truncate">
                    {label.replace(/([A-Z])/g, ' $1')}
                  </div>
                  <div className={`text-lg font-black mt-1 ${value > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {value}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
