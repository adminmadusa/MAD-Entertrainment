'use client';

import React from 'react';

import { formatDateTime } from '@mad/utils';

export interface AuditLogEntry {
  action: string;
  timestamp: string | Date;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface BookingAuditHistoryProps {
  auditHistory?: AuditLogEntry[];
}

export function BookingAuditHistory({ auditHistory }: BookingAuditHistoryProps) {
  if (!auditHistory || auditHistory.length === 0) return null;

  return (
    <div className="border-t border-white/5 pt-3 space-y-2">
      <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider">Audit & Operations History</h4>
      <div className="space-y-1.5">
        {auditHistory.map((log, idx) => (
          <div key={idx} className="bg-white/5 rounded-xl p-2.5 text-[11px] space-y-1 border border-white/5">
            <div className="flex justify-between items-center">
              <span className="text-accent-purple font-semibold">
                {log.action === 'BOOKING_EMAIL_CORRECTED' ? 'Email Corrected' : 'Tickets Resent'}
              </span>
              <span className="text-text-muted">{formatDateTime(log.timestamp)}</span>
            </div>
            <p className="text-text-secondary">{log.description}</p>
            {log.metadata?.reason && (
              <p className="text-text-muted italic bg-black/20 p-1 rounded">
                Reason: &ldquo;{String(log.metadata.reason)}&rdquo;
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
