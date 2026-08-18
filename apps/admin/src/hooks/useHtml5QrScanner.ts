'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
      if (typeof window === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
        return;
      }
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          id: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
        }));
      setDevices(videoDevices);

      // Restore saved preferred camera or select rear camera
      const savedDevice = typeof window !== 'undefined' ? localStorage.getItem('mad-preferred-camera') : null;
      setSelectedDeviceId((prevId) => {
        if (prevId && videoDevices.some((d) => d.id === prevId)) {
          return prevId;
        }
        if (savedDevice && videoDevices.some((d) => d.id === savedDevice)) {
          return savedDevice;
        }
        const rearCamera = videoDevices.find((d) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        return rearCamera?.id || videoDevices[0]?.id || '';
      });
    } catch (err) {
      console.error('Failed to enumerate media devices:', err);
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

      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {
            // ignore already stopped error
          }
        }

        const html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        const targetDevice = deviceId || selectedDeviceId;
        const cameraOption = targetDevice ? { deviceId: { exact: targetDevice } } : { facingMode: 'environment' };

        await html5QrCode.start(
          cameraOption,
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
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

        // Determine if torch is available
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
        const errStr = err?.toString?.() || '';
        const errName = err?.name || '';
        if (errStr.includes('NotAllowedError') || errName === 'NotAllowedError') {
          setPermissionState('denied');
          setError('Camera permission denied.');
        } else if (errStr.includes('NotFoundError') || errName === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError('Camera is currently unavailable.');
        }
      } finally {
        setIsInitializing(false);
      }
    },
    [isInitializing, selectedDeviceId, onScanSuccess, onScanFailure, refreshDevices]
  );

  // 5. Stop Scanner
  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
      }
    } catch {
      // ignore
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
    } catch (err) {
      console.error('Failed to toggle torch:', err);
    }
  }, [isTorchOn, hasTorch]);

  // 8. Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
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
