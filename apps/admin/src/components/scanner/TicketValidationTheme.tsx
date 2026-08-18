import React from 'react';

export type ModalTheme = {
  band: string;
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  btnBg: string;
  label: string;
};

export function resolveTheme(
  isSuccess: boolean,
  isOfflineQueued: boolean,
  isDuplicate: boolean,
  isExpired: boolean,
  isWrongEvent: boolean,
): ModalTheme {
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

export function StatusIcon({
  isDuplicate,
  isExpired,
  isWrongEvent,
  isSuccess,
  isOfflineQueued,
}: {
  isDuplicate: boolean;
  isExpired: boolean;
  isWrongEvent: boolean;
  isSuccess: boolean;
  isOfflineQueued: boolean;
}) {
  if (isSuccess || isOfflineQueued) {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (isDuplicate || isExpired) {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  if (isWrongEvent) {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    );
  }
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function triggerHaptic(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Silently no-op on unsupported browsers (iOS Safari)
  }
}

export function formatTime(isoString?: string): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
