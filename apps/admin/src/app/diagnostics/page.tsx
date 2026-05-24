'use client';

import { QUERY_KEYS } from '@mad/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { adminGetConsistencyReport, adminGetReservations, adminRepairConsistency } from '@/lib/api/admin/diagnostics.service';

export default function DiagnosticsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: QUERY_KEYS.admin.diagnostics.consistency(),
    queryFn: adminGetConsistencyReport,
    refetchInterval: 30_000,
  });

  const { data: reservations } = useQuery({
    queryKey: QUERY_KEYS.admin.diagnostics.reservations(status),
    queryFn: () => adminGetReservations(status || undefined),
    refetchInterval: 30_000,
  });

  const repairMutation = useMutation({
    mutationFn: adminRepairConsistency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.diagnostics.consistency() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.diagnostics.reservations(status) });
    },
  });

  const hasDrift = !!report && Object.values(report.drift).some((value) => value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Consistency Diagnostics</h1>
          <p className="text-text-muted text-sm mt-0.5">
            Reservation, Redis lock, payment, and inventory drift monitoring.
          </p>
        </div>
        <button
          type="button"
          onClick={() => repairMutation.mutate()}
          disabled={repairMutation.isPending}
          className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl disabled:opacity-60"
        >
          {repairMutation.isPending ? 'Repairing...' : 'Run Repair'}
        </button>
      </div>

      <div className={`rounded-2xl border p-4 ${hasDrift ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-green-500/30 bg-green-500/10'}`}>
        <div className="text-sm font-bold text-white">
          {isLoading ? 'Checking consistency...' : hasDrift ? 'Drift detected' : 'No inventory drift detected'}
        </div>
        <div className="text-xs text-text-muted mt-1">
          Last report: {report?.generatedAt ? new Date(report.generatedAt).toLocaleString('en-IN') : '-'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {report && Object.entries(report.counts).map(([label, value]) => (
          <MetricCard key={label} label={label} value={value} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {report && Object.entries(report.drift).map(([label, value]) => (
          <MetricCard key={label} label={label} value={value} tone={value > 0 ? 'warn' : 'ok'} />
        ))}
      </div>

      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <h2 className="text-white font-bold">Reservation Ledger</h2>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="px-3 py-2 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary"
          >
            <option value="">All statuses</option>
            <option value="reserved">Reserved</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="expired">Expired</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted">
                {['Reservation', 'Status', 'Inventory', 'Qty', 'Seat/Section', 'Booking', 'Version', 'Expires'].map((heading) => (
                  <th key={heading} className="text-left font-medium py-3 px-4">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(reservations ?? []).map((reservation) => (
                <tr key={reservation._id} className="border-b border-border-subtle/40">
                  <td className="py-3 px-4 font-mono text-accent-purple">{reservation.reservationId}</td>
                  <td className="py-3 px-4 text-white">{reservation.status}</td>
                  <td className="py-3 px-4 text-text-secondary">{reservation.inventoryState}</td>
                  <td className="py-3 px-4 text-text-secondary">{reservation.quantity}</td>
                  <td className="py-3 px-4 text-text-secondary">{reservation.seatId ?? reservation.section ?? '-'}</td>
                  <td className="py-3 px-4 text-text-secondary">{reservation.bookingReference ?? '-'}</td>
                  <td className="py-3 px-4 text-text-secondary">{reservation.reservationVersion}</td>
                  <td className="py-3 px-4 text-text-secondary">{new Date(reservation.expiresAt).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {!reservations?.length && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-text-muted">No reservations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'warn' }) {
  return (
    <div className={`glass rounded-xl border p-4 ${tone === 'warn' ? 'border-yellow-500/30' : tone === 'ok' ? 'border-green-500/30' : 'border-border-subtle'}`}>
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label.replace(/([A-Z])/g, ' $1')}</div>
      <div className="text-2xl font-black text-white mt-2">{value.toLocaleString('en-IN')}</div>
    </div>
  );
}
