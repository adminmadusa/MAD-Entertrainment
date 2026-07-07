'use client';

import { useEffect, useState } from 'react';
import { useHtml5QrScanner } from '../../hooks/useHtml5QrScanner';

interface ScannerCameraProps {
  isOffline: boolean;
  onScan: (ticketId: string) => void;
  scannerState: string;
}

export function ScannerCamera({ isOffline, onScan, scannerState }: ScannerCameraProps) {
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
  } = useHtml5QrScanner({
    onScanSuccess: (decodedText) => {
      onScan(decodedText);
    },
  });

  const [manualCode, setManualCode] = useState('');

  // Auto-start camera when a device is selected and scanner is not active
  useEffect(() => {
    if (selectedDeviceId && !isScanning && permissionState !== 'denied') {
      startScanner();
    }
  }, [selectedDeviceId, startScanner, isScanning, permissionState]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
    }
  };

  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-6 bg-background-card/50">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-accent-purple rounded-full animate-pulse" />
            Live Scan Stream
          </h2>
          <p className="text-text-muted text-xs mt-1">
            {isOffline ? 'Running in Offline Cache Mode' : 'Connected to Gate Validation API'}
          </p>
        </div>

        {/* Camera Selector */}
        {devices.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="camera-select" className="text-xs text-text-secondary font-medium">Camera:</label>
            <select
              id="camera-select"
              value={selectedDeviceId}
              onChange={(e) => switchCamera(e.target.value)}
              className="bg-background border border-border-subtle text-white text-xs rounded-lg px-2.5 py-1.5 focus:border-accent-purple focus:ring-1 focus:ring-accent-purple outline-none"
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Media Window Container */}
      <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-2xl border border-white/10 bg-background flex flex-col items-center justify-center">
        {/* html5-qrcode target preview */}
        <div
          id={containerId}
          className={`w-full h-full object-cover ${isScanning ? 'block' : 'hidden'}`}
        />

        {/* Not Scanning Overlay State */}
        {!isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
            {isInitializing ? (
              <>
                <div className="w-10 h-10 border-4 border-accent-purple border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-white">Accessing media stream...</p>
              </>
            ) : permissionState === 'denied' ? (
              <>
                <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Camera Permission Denied</p>
                  <p className="text-xs text-text-secondary mt-1">Please allow camera access in your browser settings to scan QR codes.</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-white/5 text-text-muted rounded-full flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Camera is currently inactive</p>
                  <button
                    onClick={startScanner}
                    className="mt-3 px-4 py-2 bg-accent-purple text-white text-xs font-semibold rounded-lg hover:bg-accent-purple-light transition-all"
                  >
                    Activate Camera
                  </button>
                </div>
              </>
            )}
            {cameraError && <p className="text-xs text-red-400 mt-2 font-medium">{cameraError}</p>}
          </div>
        )}

        {/* scanning guidelines box overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-dashed border-accent-purple/80 rounded-xl relative">
              <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-accent-purple" />
              <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-accent-purple" />
              <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-accent-purple" />
              <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-accent-purple" />
            </div>
          </div>
        )}
      </div>

      {/* Scanner Controls (Torch, Pause/Resume) */}
      {isScanning && (
        <div className="flex justify-center items-center gap-4">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-3 rounded-xl border transition-all ${
                isTorchOn
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-white/5 border-white/10 text-text-muted hover:text-white'
              }`}
              title="Toggle Flashlight"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H9v12h6z"/><path d="M12 14v8"/></svg>
            </button>
          )}
          <button
            onClick={stopScanner}
            className="px-4 py-2 bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/25 transition-all"
          >
            Pause Camera
          </button>
        </div>
      )}

      {/* Manual Input Fallback */}
      <form onSubmit={handleManualSubmit} className="pt-2 border-t border-white/5">
        <label htmlFor="manual-entry" className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">
          Manual Code / Keyboard Scanner Entry
        </label>
        <div className="flex gap-2">
          <input
            id="manual-entry"
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter Ticket ID (e.g. TKT-XXXX-XXX)"
            className="flex-1 bg-background border border-border-subtle rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:border-accent-purple focus:ring-1 focus:ring-accent-purple outline-none transition-all"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!manualCode.trim() || scannerState === 'Processing'}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
