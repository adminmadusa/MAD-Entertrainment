import React from 'react';

interface ScannerCameraOverlayProps {
  isScanning: boolean;
  isUserPaused: boolean;
  isInitializing: boolean;
  permissionState: string;
  cameraError: string | null;
  onResumeCamera: () => Promise<void>;
}

export function ScannerCameraOverlay({
  isScanning,
  isUserPaused,
  isInitializing,
  permissionState,
  cameraError,
  onResumeCamera,
}: ScannerCameraOverlayProps) {
  if (isScanning && !isUserPaused) {
    return null;
  }

  return (
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
            onClick={onResumeCamera}
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
              onClick={onResumeCamera}
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
  );
}
