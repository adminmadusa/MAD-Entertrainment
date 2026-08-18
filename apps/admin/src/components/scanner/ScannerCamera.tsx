import { useEffect, useState, useRef, useCallback } from 'react';

import { useHtml5QrScanner } from '../../hooks/useHtml5QrScanner';
import { ScannerModeState } from '../../hooks/useScannerState';

const SCAN_DEBOUNCE_MS = 350;

interface ScannerCameraProps {
  isOffline: boolean;
  onScan: (ticketId: string) => void;
  scannerState: ScannerModeState;
  isPaused: boolean;
}

export function ScannerCamera({ isOffline, onScan, scannerState, isPaused }: ScannerCameraProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUserPaused, setIsUserPaused] = useState(false);

  // Refs for pause gate and debounce
  const isPausedRef = useRef(isPaused);
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      const now = Date.now();
      if (isPausedRef.current) return;
      if (now - lastScanTimeRef.current < SCAN_DEBOUNCE_MS) return;
      lastScanTimeRef.current = now;
      onScan(decodedText);
    },
    [onScan]
  );

  const {
    devices,
    selectedDeviceId,
    isInitializing,
    isScanning,
    isTorchOn,
    hasTorch,
    permissionState,
    error: cameraError,
    startScanner,
    stopScanner,
    switchCamera,
    toggleTorch,
    containerId,
  } = useHtml5QrScanner({ onScanSuccess: handleScanSuccess });

  // Pause/stop camera whenever component is paused (e.g. modal open, tab changed)
  useEffect(() => {
    isPausedRef.current = isPaused;
    if (isPaused && isScanning) {
      stopScanner();
    }
  }, [isPaused, isScanning, stopScanner]);

  const handlePauseCamera = async () => {
    setIsUserPaused(true);
    await stopScanner();
  };

  const handleResumeCamera = async () => {
    setIsUserPaused(false);
    await startScanner();
  };

  // Fullscreen handlers
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
      } else {
        document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
      }
    } catch (err) {
      console.warn('Fullscreen API error:', err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Status chip configuration
  const statusChip = (() => {
    if (scannerState === 'Processing') {
      return { dot: 'bg-blue-500 animate-pulse', text: 'text-blue-400', label: 'Verifying Ticket...' };
    }
    if (isPaused || isUserPaused) {
      return { dot: 'bg-amber-500', text: 'text-amber-400', label: 'Scan Paused' };
    }
    if (isInitializing) {
      return { dot: 'bg-white/40 animate-pulse', text: 'text-text-secondary', label: 'Camera Starting...' };
    }
    if (isScanning) {
      return { dot: 'bg-emerald-500 animate-pulse', text: 'text-emerald-400', label: 'Ready to Scan' };
    }
    return { dot: 'bg-white/30', text: 'text-text-muted', label: 'Camera Inactive' };
  })();

  return (
    <div
      ref={containerRef}
      className={`glass rounded-2xl border border-border-subtle p-6 space-y-5 transition-all ${
        isFullscreen
          ? 'bg-[#0f111a] w-full h-full max-w-none flex flex-col justify-center p-8'
          : 'bg-background-card/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-accent-purple rounded-full animate-pulse" />
            Live Scan Stream
          </h2>
          <p className="text-text-muted text-xs mt-1">
            {isOffline ? 'Running in Offline Cache Mode' : 'Connected to Gate Validation API'}
          </p>
        </div>

        {/* Fullscreen trigger */}
        <button
          onClick={toggleFullscreen}
          type="button"
          className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-white/70 hover:text-white transition-all flex items-center justify-center focus-ring"
          title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
        >
          {isFullscreen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>
      </div>

      {/* Status chip */}
      <div className="flex justify-center">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/8 text-xs font-bold ${statusChip.text}`}
          aria-live="polite"
          aria-atomic="true"
        >
          <span className={`w-2 h-2 rounded-full ${statusChip.dot}`} aria-hidden="true" />
          {statusChip.label}
        </div>
      </div>

      {/* Camera window — target container remains mounted and measurable */}
      <div className="relative aspect-[3/4] sm:aspect-square w-full max-w-md mx-auto overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-background via-[#0f111a] to-background-card flex flex-col items-center justify-center shadow-inner">
        {/* html5-qrcode target container */}
        <div id={containerId} className="w-full h-full object-cover" />

        {/* Inactive or error overlay */}
        {(!isScanning || isUserPaused) && (
          <div className="absolute inset-0 bg-[#0b0f19]/90 backdrop-blur-xs flex flex-col items-center justify-center p-8 text-center space-y-5 z-20">
            {isInitializing ? (
              <>
                <div className="w-10 h-10 border-4 border-accent-purple border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-white">Accessing camera stream...</p>
              </>
            ) : permissionState === 'denied' || cameraError ? (
              <>
                <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center border border-red-500/20 shadow-glow-sm">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Camera Access Issue</p>
                  <p className="text-xs text-red-300 mt-1 max-w-[280px] leading-relaxed">
                    {cameraError || 'Camera permission denied. Please allow camera access in your browser settings.'}
                  </p>
                </div>
                <button
                  onClick={handleResumeCamera}
                  type="button"
                  className="px-5 py-2.5 min-h-[44px] bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all focus-ring"
                >
                  Retry Camera Access
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-white/5 text-white/40 rounded-full flex items-center justify-center border border-white/10 shadow-glow-sm">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <div className="flex flex-col items-center space-y-1.5">
                  <p className="text-sm font-bold text-white tracking-wide">
                    {isUserPaused ? 'Scanner Camera Paused' : 'Scanner Camera Ready'}
                  </p>
                  <p className="text-xs text-text-muted max-w-[260px]">
                    {isUserPaused
                      ? 'Camera stream paused. Click below to resume scanning.'
                      : 'Click below to activate camera and start scanning tickets.'}
                  </p>
                  <button
                    onClick={handleResumeCamera}
                    type="button"
                    className="mt-3 px-6 py-3.5 min-h-[48px] bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl shadow-glow-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 focus-ring"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>{isUserPaused ? 'Resume Camera Scan' : 'Start Camera Scan'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Active scanning QR frame overlay */}
        {isScanning && !isPaused && !isUserPaused && scannerState !== 'Processing' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4 z-10">
            <div className="bg-black/60 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/5 mt-2">
              <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">
                Align QR Code Within Frame
              </p>
            </div>
            <div className="w-60 h-60 relative my-auto">
              <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
              <div className="absolute inset-x-2 top-0 h-[3px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10b981] rounded-full scanner-line" />
            </div>
            <div className="h-4" />
          </div>
        )}

        {/* Verifying overlay — shown during API call */}
        {scannerState === 'Processing' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
            <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-white">Verifying Ticket...</p>
          </div>
        )}

        {/* Paused overlay — shown after result card is open */}
        {isPaused && !isUserPaused && scannerState !== 'Processing' && isScanning && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="bg-black/60 border border-white/10 rounded-full px-4 py-2">
              <p className="text-xs font-bold text-white/70 tracking-widest uppercase">Paused</p>
            </div>
          </div>
        )}
      </div>

      {/* Camera selection & controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full max-w-md mx-auto">
        {devices.length > 1 && (
          <select
            value={selectedDeviceId}
            onChange={(e) => switchCamera(e.target.value)}
            className="w-full sm:w-auto flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus-ring min-h-[44px]"
            aria-label="Select camera device"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id} className="bg-background text-white">
                {device.label}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {hasTorch && isScanning && !isUserPaused && (
            <button
              onClick={toggleTorch}
              type="button"
              aria-pressed={isTorchOn}
              className={`p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-all focus-ring ${
                isTorchOn
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-white/5 border-white/10 text-text-muted hover:text-white'
              }`}
              title="Toggle Flashlight"
              aria-label="Toggle flashlight"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 2H9v12h6z" />
                <path d="M12 14v8" />
              </svg>
            </button>
          )}

          {isScanning && !isUserPaused ? (
            <button
              onClick={handlePauseCamera}
              type="button"
              className="flex-1 sm:flex-initial py-3 px-4 min-h-[44px] bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl hover:bg-red-500/25 transition-all focus-ring"
            >
              Pause Camera
            </button>
          ) : (
            <button
              onClick={handleResumeCamera}
              type="button"
              className="flex-1 sm:flex-initial py-3 px-4 min-h-[44px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl hover:bg-emerald-500/25 transition-all focus-ring"
            >
              Start Camera
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
