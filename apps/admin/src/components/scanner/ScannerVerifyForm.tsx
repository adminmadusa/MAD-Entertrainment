'use client';

import { useState, useRef, useEffect } from 'react';
import { ScannerModeState } from '../../hooks/useScannerState';

interface ScannerVerifyFormProps {
  scannerState: ScannerModeState;
  onSubmit: (code: string) => void;
  onBackToScan: () => void;
}

export function ScannerVerifyForm({
  scannerState,
  onSubmit,
  onBackToScan,
}: ScannerVerifyFormProps) {
  const [manualCode, setManualCode] = useState('');
  const verifyInputRef = useRef<HTMLInputElement>(null);
  const currentYear = new Date().getFullYear();
  const defaultPrefix = `TKT-MAD-${currentYear}-`;

  useEffect(() => {
    const timeout = setTimeout(() => verifyInputRef.current?.focus(), 120);
    return () => clearTimeout(timeout);
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = manualCode.trim();
    if (!raw || scannerState === 'Processing') return;

    // Smart Prefix Resolution: If user enters short code without TKT- prefix or URL, auto-prepend default prefix
    let finalCode = raw;
    if (!raw.toUpperCase().startsWith('TKT-') && !raw.startsWith('http://') && !raw.startsWith('https://')) {
      finalCode = `${defaultPrefix}${raw.toUpperCase()}`;
    }

    onSubmit(finalCode);
    setManualCode('');
  };

  return (
    <div
      role="tabpanel"
      id="tabpanel-verify"
      aria-labelledby="tab-verify"
      className="glass rounded-2xl border border-border-subtle p-6 md:p-8 bg-background-card/50 max-w-2xl mx-auto space-y-6"
    >
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Manual Ticket Verification</h2>
        <p className="text-text-muted text-xs max-w-md mx-auto">
          Enter the ticket code below. The standard prefix is automatically added if omitted.
        </p>
      </div>

      <form onSubmit={handleManualSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <label
            htmlFor="verify-ticket-input"
            className="block text-xs font-bold text-text-secondary uppercase tracking-wider"
          >
            Ticket Number
          </label>

          {/* Smart Prefix Input Group */}
          <div className="flex items-stretch rounded-xl overflow-hidden border border-border-subtle focus-within:border-accent-purple transition-all shadow-sm">
            <span
              className="px-3.5 py-3 bg-white/5 border-r border-white/10 text-xs font-mono font-bold text-accent-purple select-none flex items-center shrink-0 tracking-wide"
              title="Default Ticket Prefix"
            >
              {defaultPrefix}
            </span>
            <input
              ref={verifyInputRef}
              id="verify-ticket-input"
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. X7Y8Z-001 (or paste full ID)"
              className="flex-1 bg-background px-4 py-3 min-h-[48px] text-sm font-mono text-white placeholder:text-text-muted placeholder:font-sans focus:outline-none transition-all uppercase"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              enterKeyHint="search"
              spellCheck={false}
            />
          </div>

          <p className="text-[11px] text-text-muted">
            Tip: You only need to type the remaining 8–9 characters (e.g. <span className="text-white font-mono font-semibold">X7Y8Z-001</span>), or paste a full ticket link.
          </p>
        </div>

        {(() => {
          const raw = manualCode.trim();
          if (!raw) return null;
          const previewId = !raw.toUpperCase().startsWith('TKT-') && !raw.startsWith('http://') && !raw.startsWith('https://')
            ? `${defaultPrefix}${raw.toUpperCase()}`
            : raw;
          return (
            <div className="bg-accent-purple/5 border border-accent-purple/30 rounded-xl p-3.5 flex items-center justify-between text-xs animate-fadeIn">
              <div className="space-y-0.5 min-w-0 pr-2">
                <span className="text-text-muted text-[10px] uppercase tracking-wider font-semibold block">Target Ticket Preview</span>
                <p className="font-mono font-bold text-accent-purple-light text-sm truncate">{previewId}</p>
              </div>
              <span className="shrink-0 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1">
                ✓ Ready
              </span>
            </div>
          );
        })()}

        <div className="space-y-3 pt-2">
          <button
            type="submit"
            disabled={!manualCode.trim() || scannerState === 'Processing'}
            className="w-full py-4 min-h-[52px] bg-accent-purple hover:bg-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold tracking-wide rounded-xl shadow-glow-sm transition-all hover:scale-[1.01] active:scale-[0.99] focus-ring flex items-center justify-center gap-2"
          >
            {scannerState === 'Processing' ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying Ticket...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Verify & Check In</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBackToScan}
            className="w-full py-3 min-h-[44px] text-text-secondary text-xs font-bold hover:text-white transition-colors focus-ring rounded-xl flex items-center justify-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back to Live Scanner</span>
          </button>
        </div>
      </form>
    </div>
  );
}
