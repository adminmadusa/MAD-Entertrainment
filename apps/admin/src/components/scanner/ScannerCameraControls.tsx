import React from 'react';

interface DeviceItem {
  id: string;
  label: string;
}

interface ScannerCameraControlsProps {
  devices: DeviceItem[];
  selectedDeviceId: string;
  onSwitchCamera: (deviceId: string) => void;
  hasTorch: boolean;
  isTorchOn: boolean;
  isScanning: boolean;
  isUserPaused: boolean;
  onToggleTorch: () => void;
  onPauseCamera: () => void;
  onResumeCamera: () => void;
}

export function ScannerCameraControls({
  devices,
  selectedDeviceId,
  onSwitchCamera,
  hasTorch,
  isTorchOn,
  isScanning,
  isUserPaused,
  onToggleTorch,
  onPauseCamera,
  onResumeCamera,
}: ScannerCameraControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full max-w-md mx-auto">
      {devices.length > 1 && (
        <select
          value={selectedDeviceId}
          onChange={(e) => onSwitchCamera(e.target.value)}
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
            onClick={onToggleTorch}
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
            onClick={onPauseCamera}
            type="button"
            className="flex-1 sm:flex-initial py-3 px-4 min-h-[44px] bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl hover:bg-red-500/25 transition-all focus-ring"
          >
            Pause Camera
          </button>
        ) : (
          <button
            onClick={onResumeCamera}
            type="button"
            className="flex-1 sm:flex-initial py-3 px-4 min-h-[44px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl hover:bg-emerald-500/25 transition-all focus-ring"
          >
            Start Camera
          </button>
        )}
      </div>
    </div>
  );
}
