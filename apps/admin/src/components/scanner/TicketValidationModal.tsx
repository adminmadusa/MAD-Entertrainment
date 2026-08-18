'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';

import { ValidationResult } from '../../lib/api/admin/scanner.service';
import {
  resolveTheme,
  StatusIcon,
  triggerHaptic,
  formatTime,
} from './TicketValidationTheme';

interface TicketValidationModalProps {
  result: ValidationResult | null;
  onClose: () => void;
  onSwitchToVerify?: () => void;
}

export function TicketValidationModal({ result, onClose, onSwitchToVerify }: TicketValidationModalProps) {
  const isSuccess = result?.status === 'SUCCESS';
  const isOfflineQueued = result?.status === 'OFFLINE_QUEUED';
  const isDuplicate = result?.status === 'ALREADY_SCANNED';
  const isExpired = result?.status === 'EXPIRED';
  const isWrongEvent = result?.status === 'WRONG_EVENT';
  const isInvalid = result?.status === 'INVALID' || result?.status === 'ERROR';
  const showVerifyAction = isInvalid || isWrongEvent;

  // Haptic feedback on result mount
  useEffect(() => {
    if (!result) return;
    if (isSuccess || isOfflineQueued) {
      triggerHaptic(80);
    } else if (isDuplicate) {
      triggerHaptic([80, 60, 80]);
    } else {
      triggerHaptic(300);
    }
  }, [result, isSuccess, isOfflineQueued, isDuplicate]);

  // Escape key listener for accessible keyboard dismiss
  useEffect(() => {
    if (!result) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, onClose]);

  if (!result) return null;

  const theme = resolveTheme(isSuccess, isOfflineQueued, isDuplicate, isExpired, isWrongEvent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
        aria-hidden="true"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Scan result: ${theme.label}`}
        initial={{ opacity: 0, scale: 0.92, y: 28 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 28 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`relative w-full max-w-sm overflow-hidden rounded-3xl border shadow-2xl ${theme.bg} ${theme.border}`}
      >
        {/* Top colored band */}
        <div className={`h-1.5 w-full ${theme.band}`} />

        <div className="p-6 space-y-5">
          {/* Status header */}
          <div className="flex items-center gap-4">
            <div
              className={`flex-shrink-0 w-14 h-14 rounded-2xl border flex items-center justify-center ${theme.iconBg}`}
              aria-hidden="true"
            >
              <StatusIcon
                isDuplicate={isDuplicate}
                isExpired={isExpired}
                isWrongEvent={isWrongEvent}
                isSuccess={isSuccess}
                isOfflineQueued={isOfflineQueued}
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-xs font-black tracking-widest uppercase block ${theme.text}`}>
                {theme.label}
              </span>
              <p className="text-xs text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                {result.message}
              </p>
            </div>
          </div>

          {/* Ticket Information */}
          <div className="rounded-2xl bg-black/30 border border-white/5 p-4 space-y-3">
            {/* Ticket ID */}
            {result.ticketId && (
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Ticket Identifier
                </span>
                <span className="font-mono text-sm font-bold text-white tracking-wider break-all">
                  {result.ticketId}
                </span>
              </div>
            )}

            {/* Guest Name */}
            {result.guestName && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Attendee
                </span>
                <span className="text-sm font-bold text-white">
                  {result.guestName}
                </span>
              </div>
            )}

            {/* Tier & Admits */}
            {(result.tierName || result.admits !== undefined) && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                    Tier
                  </span>
                  <span className="text-xs font-bold text-white">
                    {result.tierName ?? '—'}
                  </span>
                </div>
                {result.admits !== undefined && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                      Admits
                    </span>
                    <span className="text-xs font-black text-white">
                      {result.admits} {result.admits === 1 ? 'Person' : 'People'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Scanned Time for Duplicate */}
            {isDuplicate && result.scannedAt && (
              <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-amber-400 text-xs">
                <span className="font-bold">Prior Check-in</span>
                <span className="font-mono font-semibold">{formatTime(result.scannedAt)}</span>
              </div>
            )}

            {/* Scan Timestamp for Success */}
            {isSuccess && result.scannedAt && (
              <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-emerald-400 text-xs">
                <span className="font-bold">Entry Recorded</span>
                <span className="font-mono font-semibold">{formatTime(result.scannedAt)}</span>
              </div>
            )}
          </div>

          {/* Action Buttons with min-h-[48px] touch targets */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className={`w-full py-3.5 min-h-[48px] rounded-xl text-sm font-black tracking-wide text-white border transition-all focus-ring ${theme.btnBg}`}
            >
              Next Scan (Space / Tap)
            </button>

            {showVerifyAction && onSwitchToVerify && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToVerify();
                }}
                className="w-full py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-text-muted hover:text-white bg-white/5 hover:bg-white/10 transition-colors focus-ring"
              >
                Switch to Manual Verify
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
