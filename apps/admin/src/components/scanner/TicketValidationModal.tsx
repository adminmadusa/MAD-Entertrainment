'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

import { ValidationResult } from '../../lib/api/admin/scanner.service';

interface TicketValidationModalProps {
  result: ValidationResult | null;
  onClose: () => void;
  autoDismissMs?: number;
}

export function TicketValidationModal({ result, onClose, autoDismissMs = 1500 }: TicketValidationModalProps) {
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [result, onClose, autoDismissMs]);

  if (!result) return null;

  const isSuccess = result.status === 'SUCCESS' || result.status === 'OFFLINE_QUEUED';
  const isDuplicate = result.status === 'ALREADY_SCANNED';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className={`w-full max-w-md overflow-hidden rounded-3xl border shadow-glow-sm p-6 text-center space-y-4 ${
            isSuccess
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : isDuplicate
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {/* Animated Status Icon */}
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0.5, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                isSuccess
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                  : isDuplicate
                  ? 'border-amber-500/50 bg-amber-500/20 text-amber-400'
                  : 'border-red-500/50 bg-red-500/20 text-red-400'
              }`}
            >
              {isSuccess ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : isDuplicate ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              )}
            </motion.div>
          </div>

          {/* Validation Status Text */}
          <div>
            <h3 className="text-2xl font-black tracking-wide uppercase">
              {result.status.replace('_', ' ')}
            </h3>
            <p className="font-mono text-xs text-text-muted mt-1.5">{result.ticketId}</p>
          </div>

          {/* Validation Information Detail Card */}
          {isSuccess && (
            <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl">
              <p className="text-base font-bold text-emerald-300">
                ADMIT: {result.admits} {result.admits && result.admits > 1 ? 'PEOPLE' : 'PERSON'}
              </p>
              <p className="text-xxs uppercase text-text-muted mt-0.5 tracking-widest">{result.tierName}</p>
              {result.guestName && (
                <p className="text-xs font-semibold text-white mt-1.5">{result.guestName}</p>
              )}
            </div>
          )}

          {/* Error Message */}
          {!isSuccess && (
            <div className="p-3 bg-background border border-white/5 rounded-2xl text-xs text-text-secondary leading-relaxed">
              {result.message}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${
              isSuccess
                ? 'bg-emerald-500/20 hover:bg-emerald-500/35 border-emerald-500/40 text-white'
                : isDuplicate
                ? 'bg-amber-500/20 hover:bg-amber-500/35 border-amber-500/40 text-white'
                : 'bg-red-500/20 hover:bg-red-500/35 border-red-500/40 text-white'
            }`}
          >
            Dismiss
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
