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

  useEffect(() => {
    const timeout = setTimeout(() => verifyInputRef.current?.focus(), 120);
    return () => clearTimeout(timeout);
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code || scannerState === 'Processing') return;
    onSubmit(code);
    setManualCode('');
  };

  return (
    <div
      role="tabpanel"
      id="tabpanel-verify"
      aria-labelledby="tab-verify"
      className="glass rounded-2xl border border-border-subtle p-6 bg-background-card/50 space-y-5"
    >
      <div>
        <h2 className="text-lg font-bold text-white">Manual Verification</h2>
        <p className="text-text-muted text-xs mt-1">
          Use when the QR code is damaged, too dark, or cannot be scanned.
        </p>
      </div>

      <form onSubmit={handleManualSubmit} className="space-y-3" noValidate>
        <div>
          <label
            htmlFor="verify-ticket-input"
            className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2"
          >
            Ticket Number
          </label>
          <input
            ref={verifyInputRef}
            id="verify-ticket-input"
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter Ticket ID (e.g. TKT-XXXX-XXX)"
            className="w-full bg-background border border-border-subtle rounded-xl px-4 py-3 min-h-[44px] text-sm font-mono text-white focus-ring outline-none transition-all"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            enterKeyHint="search"
            spellCheck={false}
          />
        </div>

        <button
          type="submit"
          disabled={!manualCode.trim() || scannerState === 'Processing'}
          className="w-full py-4 min-h-[56px] bg-accent-purple hover:bg-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black tracking-wide rounded-xl transition-all focus-ring flex items-center justify-center"
        >
          {scannerState === 'Processing' ? 'Verifying...' : 'Verify Ticket'}
        </button>
      </form>

      <button
        type="button"
        onClick={onBackToScan}
        className="w-full py-2.5 min-h-[44px] text-text-muted text-xs font-bold hover:text-white transition-colors focus-ring rounded-xl flex items-center justify-center gap-1.5"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Scanner
      </button>
    </div>
  );
}
