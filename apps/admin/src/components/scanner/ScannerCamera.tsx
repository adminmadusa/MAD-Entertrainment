import { useEffect, useState, useRef, useCallback } from 'react';

import { useHtml5QrScanner } from '../../hooks/useHtml5QrScanner';
import { ScannerModeState } from '../../hooks/useScannerState';
import { ScannerCameraControls } from './ScannerCameraControls';
import { ScannerCameraOverlay } from './ScannerCameraOverlay';

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

      {/* Camera window */}
      <div className="relative aspect-[3/4] sm:aspect-square w-full max-w-md mx-auto overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-background via-[#0f111a] to-background-card flex flex-col items-center justify-center shadow-inner">
        {/* html5-qrcode target container */}
        <div id={containerId} className="w-full h-full object-cover" />

        {/* Inactive, Error, or Permission Overlay */}
        <ScannerCameraOverlay
          isScanning={isScanning}
          isUserPaused={isUserPaused}
          isInitializing={isInitializing}
          permissionState={permissionState}
          cameraError={cameraError}
          onResumeCamera={handleResumeCamera}
        />

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

        {/* Verifying overlay */}
        {scannerState === 'Processing' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
            <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-white">Verifying Ticket...</p>
          </div>
        )}

        {/* Paused overlay */}
        {isPaused && !isUserPaused && scannerState !== 'Processing' && isScanning && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="bg-black/60 border border-white/10 rounded-full px-4 py-2">
              <p className="text-xs font-bold text-white/70 tracking-widest uppercase">Paused</p>
            </div>
          </div>
        )}
      </div>

      {/* Camera selection & controls */}
      <ScannerCameraControls
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSwitchCamera={switchCamera}
        hasTorch={hasTorch}
        isTorchOn={isTorchOn}
        isScanning={isScanning}
        isUserPaused={isUserPaused}
        onToggleTorch={toggleTorch}
        onPauseCamera={handlePauseCamera}
        onResumeCamera={handleResumeCamera}
      />
    </div>
  );
}
