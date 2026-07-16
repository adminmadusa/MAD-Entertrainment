'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';

import { ValidationResult } from '../../lib/api/admin/scanner.service';

interface TicketValidationModalProps {
  result: ValidationResult | null;
  onClose: () => void;
  onSwitchToVerify?: () => void;
}

function triggerHaptic(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Silently no-op on unsupported browsers (iOS Safari)
  }
}

function formatTime(isoString?: string): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

type Theme = {
  band: string;
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  btnBg: string;
  label: string;
};

function resolveTheme(
  isSuccess: boolean,
  isOfflineQueued: boolean,
  isDuplicate: boolean,
  isExpired: boolean,
  isWrongEvent: boolean,
): Theme {
  if (isSuccess || isOfflineQueued) {
    return {
      band: 'bg-emerald-500',
      bg: 'bg-emerald-950/98',
      border: 'border-emerald-500/50',
      text: 'text-emerald-300',
      iconBg: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
      btnBg: 'bg-emerald-500/25 hover:bg-emerald-500/40 border-emerald-500/40',
      label: isOfflineQueued ? '✓ ACCEPTED' : '✓ VALID TICKET',
    };
  }
  if (isDuplicate) {
    return {
      band: 'bg-amber-500',
      bg: 'bg-amber-950/98',
      border: 'border-amber-500/50',
      text: 'text-amber-300',
      iconBg: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
      btnBg: 'bg-amber-500/25 hover:bg-amber-500/40 border-amber-500/40',
      label: '⚠ ALREADY CHECKED IN',
    };
  }
  if (isExpired) {
    return {
      band: 'bg-orange-500',
      bg: 'bg-orange-950/98',
      border: 'border-orange-500/50',
      text: 'text-orange-300',
      iconBg: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
      btnBg: 'bg-orange-500/25 hover:bg-orange-500/40 border-orange-500/40',
      label: '⏰ TICKET EXPIRED',
    };
  }
  if (isWrongEvent) {
    return {
      band: 'bg-purple-500',
      bg: 'bg-purple-950/98',
      border: 'border-purple-500/50',
      text: 'text-purple-300',
      iconBg: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
      btnBg: 'bg-purple-500/25 hover:bg-purple-500/40 border-purple-500/40',
      label: '🚫 WRONG EVENT',
    };
  }
  // INVALID / ERROR
  return {
    band: 'bg-red-500',
    bg: 'bg-red-950/98',
    border: 'border-red-500/50',
    text: 'text-red-300',
    iconBg: 'bg-red-500/20 border-red-500/50 text-red-400',
    btnBg: 'bg-red-500/25 hover:bg-red-500/40 border-red-500/40',
    label: '✕ INVALID QR CODE',
  };
}

function StatusIcon({ isDuplicate, isExpired, isWrongEvent, isSuccess, isOfflineQueued }: {
  isDuplicate: boolean;
  isExpired: boolean;
  isWrongEvent: boolean;
  isSuccess: boolean;
  isOfflineQueued: boolean;
}) {
  if (isSuccess || isOfflineQueued) {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    );
  }
  if (isDuplicate || isExpired) {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    );
  }
  if (isWrongEvent) {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    );
  }
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
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

  if (!result) return null;

  const theme = resolveTheme(isSuccess, isOfflineQueued, isDuplicate, isExpired, isWrongEvent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
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
          <div className="flex flex-col items-center gap-4 text-center">
            <motion.div
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.06 }}
              className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${theme.iconBg}`}
            >
              <StatusIcon
                isSuccess={isSuccess}
                isOfflineQueued={isOfflineQueued}
                isDuplicate={isDuplicate}
                isExpired={isExpired}
                isWrongEvent={isWrongEvent}
              />
            </motion.div>

            <h2 className={`text-2xl font-black tracking-widest uppercase ${theme.text}`}>
              {theme.label}
            </h2>
          </div>

          {/* Detail card */}
          <div className="rounded-2xl bg-white/5 border border-white/8 p-4 space-y-2.5">
            {/* SUCCESS */}
            {(isSuccess || isOfflineQueued) && (
              <>
                {result.guestName && (
                  <p className="text-center text-lg font-bold text-white">{result.guestName}</p>
                )}
                {result.tierName && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted font-medium">Tier</span>
                    <span className="font-bold text-white uppercase tracking-wide">{result.tierName}</span>
                  </div>
                )}
                {result.admits && result.admits > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted font-medium">Admits</span>
                    <span className="font-bold text-emerald-400">
                      {result.admits} {result.admits > 1 ? 'People' : 'Person'}
                    </span>
                  </div>
                )}
                {result.ticketId && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted font-medium">Ticket</span>
                    <span className="font-mono text-text-secondary truncate max-w-[55%]">{result.ticketId}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted font-medium">Checked In</span>
                  <span className="font-bold text-white">{formatTime(result.scannedAt) || 'Just now'}</span>
                </div>
                {isOfflineQueued && (
                  <p className="pt-1 text-center text-[11px] text-blue-400 font-medium">
                    Saved offline · Will sync automatically
                  </p>
                )}
              </>
            )}

            {/* ALREADY_SCANNED */}
            {isDuplicate && (
              <>
                {result.guestName && (
                  <p className="text-center text-base font-bold text-white">{result.guestName}</p>
                )}
                {result.tierName && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted font-medium">Tier</span>
                    <span className="font-bold text-white uppercase">{result.tierName}</span>
                  </div>
                )}
                {result.ticketId && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted font-medium">Ticket</span>
                    <span className="font-mono text-text-secondary truncate max-w-[55%]">{result.ticketId}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted font-medium">First scanned</span>
                  <span className="font-bold text-amber-400">{formatTime(result.scannedAt) || 'Earlier today'}</span>
                </div>
              </>
            )}

            {/* EXPIRED */}
            {isExpired && (
              <>
                {result.ticketId && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted font-medium">Ticket</span>
                    <span className="font-mono text-text-secondary truncate max-w-[55%]">{result.ticketId}</span>
                  </div>
                )}
                <p className="text-xs text-text-secondary text-center leading-relaxed">
                  {result.message || 'This ticket is no longer valid for entry.'}
                </p>
              </>
            )}

            {/* WRONG_EVENT */}
            {isWrongEvent && (
              <>
                {result.message && (
                  <p className="text-xs text-text-secondary text-center leading-relaxed">{result.message}</p>
                )}
                {result.ticketId && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted font-medium">Ticket</span>
                    <span className="font-mono text-text-secondary truncate max-w-[55%]">{result.ticketId}</span>
                  </div>
                )}
              </>
            )}

            {/* INVALID / ERROR */}
            {isInvalid && (
              <>
                <p className="text-xs text-text-secondary text-center leading-relaxed">
                  {result.message || 'This QR code is invalid or cannot be verified.'}
                </p>
                {result.ticketId && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted font-medium">Code</span>
                    <span className="font-mono text-text-secondary truncate max-w-[55%]">{result.ticketId}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            {/* Secondary: Enter Ticket Number (invalid / wrong event only) */}
            {showVerifyAction && onSwitchToVerify && (
              <button
                type="button"
                onClick={() => {
                  onSwitchToVerify();
                  onClose();
                }}
                className="w-full py-3 min-h-[44px] rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 text-sm font-bold transition-all focus-ring"
              >
                Enter Ticket Number
              </button>
            )}

            {/* Primary: Next Scan */}
            <button
              type="button"
              onClick={onClose}
              className={`w-full py-4 min-h-[56px] rounded-xl border text-white text-base font-black tracking-widest uppercase transition-all focus-ring ${theme.btnBg}`}
            >
              Next Scan
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
