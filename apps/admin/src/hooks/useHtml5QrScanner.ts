'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { mapBrowserCameraError, safeStopScanner } from './scanner.utils';

export interface CameraDevice {
  id: string;
  label: string;
}

export interface UseHtml5QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (errorMessage: string) => void;
}

export function useHtml5QrScanner({ onScanSuccess, onScanFailure }: UseHtml5QrScannerProps) {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [error, setError] = useState<string | null>(null);

  const scannerRef = useRef<any>(null);
  const isStoppingRef = useRef(false);
  const containerId = 'scanner-preview-container';

  // 1. Enumerate available video inputs safely
  const refreshDevices = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          id: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
        }));
      setDevices(videoDevices);

      const savedDevice =
        typeof window !== 'undefined' ? localStorage.getItem('mad-preferred-camera') : null;
      setSelectedDeviceId((prevId) => {
        if (prevId && videoDevices.some((d) => d.id === prevId)) return prevId;
        if (savedDevice && videoDevices.some((d) => d.id === savedDevice)) return savedDevice;
        const rearCamera = videoDevices.find(
          (d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
        );
        return rearCamera?.id || videoDevices[0]?.id || '';
      });
    } catch {
      // Ignore enumeration failure
    }
  }, []);

  // 2. Listen to device hot-plugs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaDev = navigator.mediaDevices;
    if (mediaDev?.addEventListener) {
      mediaDev.addEventListener('devicechange', refreshDevices);
    }
    return () => {
      if (mediaDev?.removeEventListener) {
        mediaDev.removeEventListener('devicechange', refreshDevices);
      }
    };
  }, [refreshDevices]);

  // 3. Initialize capability checks on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.isSecureContext) {
        setError('Camera validation requires a secure HTTPS connection.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera scanning is not supported by your browser.');
        return;
      }
    }
    refreshDevices();
  }, [refreshDevices]);

  // 4. Initialize and Start Scanner
  const startScanner = useCallback(
    async (deviceId?: string) => {
      if (isInitializing || isStoppingRef.current) return;
      setIsInitializing(true);
      setError(null);

      if (typeof window !== 'undefined') {
        if (!window.isSecureContext) {
          setError('Camera validation requires a secure HTTPS connection.');
          setIsInitializing(false);
          return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('Camera scanning is not supported by your browser.');
          setIsInitializing(false);
          return;
        }
      }

      // Check if container element exists and is measurable
      if (typeof document !== 'undefined') {
        const container = document.getElementById(containerId);
        if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
          setIsInitializing(false);
          return;
        }
      }

      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        if (scannerRef.current) {
          await safeStopScanner(scannerRef.current, containerId);
        }

        const html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        const targetDevice = deviceId || selectedDeviceId;
        const cameraOption = targetDevice
          ? { deviceId: { exact: targetDevice } }
          : { facingMode: 'environment' };

        await html5QrCode.start(
          cameraOption,
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const size = Math.max(50, Math.floor((minEdge || 250) * 0.7));
              return { width: size, height: size };
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            onScanSuccess(decodedText);
          },
          (errorMessage) => {
            if (onScanFailure) onScanFailure(errorMessage);
          }
        );

        setPermissionState('granted');
        setIsScanning(true);
        setError(null);

        try {
          const capabilities = html5QrCode.getRunningTrackCapabilities();
          setHasTorch(!!(capabilities as any)?.torch);
        } catch {
          setHasTorch(false);
        }
        setIsTorchOn(false);

        await refreshDevices();
      } catch (err: any) {
        setIsScanning(false);
        const mapped = mapBrowserCameraError(err);
        setPermissionState(mapped.permissionState);
        setError(mapped.message);
      } finally {
        setIsInitializing(false);
      }
    },
    [isInitializing, selectedDeviceId, onScanSuccess, onScanFailure, refreshDevices]
  );

  // 5. Stop Scanner & Release Media Tracks
  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    try {
      await safeStopScanner(scannerRef.current, containerId);
    } finally {
      scannerRef.current = null;
      setIsScanning(false);
      setIsTorchOn(false);
      isStoppingRef.current = false;
    }
  }, []);

  // 6. Switch Camera Device
  const switchCamera = useCallback(
    async (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mad-preferred-camera', deviceId);
      }
      if (isScanning) {
        await stopScanner();
        setTimeout(() => {
          startScanner(deviceId);
        }, 150);
      }
    },
    [isScanning, startScanner, stopScanner]
  );

  // 7. Toggle Torch
  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorchState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorchState } as any],
      });
      setIsTorchOn(nextTorchState);
    } catch {
      // Ignore torch error
    }
  }, [isTorchOn, hasTorch]);

  // 8. Auto-cleanup on unmount: kill all tracks immediately
  useEffect(() => {
    return () => {
      const currentScanner = scannerRef.current;
      scannerRef.current = null;
      safeStopScanner(currentScanner, containerId);
    };
  }, []);

  return {
    devices,
    selectedDeviceId,
    isInitializing,
    isScanning,
    isTorchOn,
    hasTorch,
    permissionState,
    error,
    startScanner: () => startScanner(),
    stopScanner,
    switchCamera,
    toggleTorch,
    containerId,
    refreshDevices,
  };
}
