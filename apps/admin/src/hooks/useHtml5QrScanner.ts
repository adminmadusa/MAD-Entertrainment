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
  const containerId = 'scanner-preview-container';

  // 1. Enumerate available video inputs
  const refreshDevices = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
        return;
      }
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({
          id: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 4)}`,
        }));
      setDevices(videoDevices);

      // Restore saved preferred camera
      const savedDevice = localStorage.getItem('mad-preferred-camera');
      if (savedDevice && videoDevices.some((d) => d.id === savedDevice)) {
        setSelectedDeviceId(savedDevice);
      } else if (videoDevices.length > 0) {
        // Prefer rear camera (has "back" or "environment" or "rear")
        const rearCamera = videoDevices.find((d) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        setSelectedDeviceId(rearCamera?.id || videoDevices[0].id);
      }
    } catch (err: any) {
      console.error('Failed to enumerate media devices:', err);
    }
  }, []);

  // 2. Listen to device hot-plugs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaDev = navigator.mediaDevices;
    if (mediaDev) {
      mediaDev.addEventListener('devicechange', refreshDevices);
    }
    return () => {
      if (mediaDev) {
        mediaDev.removeEventListener('devicechange', refreshDevices);
      }
    };
  }, [refreshDevices]);

  // 3. Initialize devices on mount
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // 4. Initialize and Start Scanner
  const startScanner = useCallback(async (deviceId: string) => {
    if (!deviceId) return;
    setIsInitializing(true);
    setError(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      // Clean up previous scanner if exists
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore already stopped errors
        }
      }

      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        deviceId,
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

      // Check if torch (flashlight) is supported
      const capabilities = html5QrCode.getRunningTrackCapabilities();
      setHasTorch(!!(capabilities as any)?.torch);
      setIsTorchOn(false);
    } catch (err: any) {
      console.error('Html5Qrcode initialization error:', err);
      setIsScanning(false);
      if (err?.toString().includes('NotAllowedError') || err?.name === 'NotAllowedError') {
        setPermissionState('denied');
        setError('Camera permission denied.');
      } else {
        setError('Camera is currently unavailable.');
      }
    } finally {
      setIsInitializing(false);
    }
  }, [onScanSuccess, onScanFailure]);

  // 5. Stop Scanner
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
        setIsTorchOn(false);
      }
    }
  }, []);

  // 6. Switch Camera Device
  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    localStorage.setItem('mad-preferred-camera', deviceId);
    if (isScanning) {
      await stopScanner();
      setTimeout(() => {
        startScanner(deviceId);
      }, 100);
    }
  }, [isScanning, startScanner, stopScanner]);

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
        scannerRef.current.stop().catch(console.error);
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
    startScanner: () => startScanner(selectedDeviceId),
    stopScanner,
    switchCamera,
    toggleTorch,
    containerId,
    refreshDevices,
  };
}
