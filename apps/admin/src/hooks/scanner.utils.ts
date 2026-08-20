export function mapBrowserCameraError(err: any): {
  permissionState: 'prompt' | 'granted' | 'denied';
  message: string;
} {
  const errStr = (err?.message || err?.toString?.() || '').toLowerCase();
  const errName = (err?.name || '').toLowerCase();

  if (
    errName === 'notallowederror' ||
    errStr.includes('permission denied') ||
    errStr.includes('not allowed')
  ) {
    return {
      permissionState: 'denied',
      message:
        'Camera permission denied. Please allow camera access in your browser settings or address bar.',
    };
  }

  if (
    errName === 'notfounderror' ||
    errName === 'devicesnotfounderror' ||
    errStr.includes('not found') ||
    errStr.includes('no camera')
  ) {
    return {
      permissionState: 'prompt',
      message:
        'No camera hardware detected. Please connect a webcam or use the Manual Verify tab.',
    };
  }

  if (
    errName === 'notreadableerror' ||
    errName === 'trackstarterror' ||
    errStr.includes('could not start') ||
    errStr.includes('already in use')
  ) {
    return {
      permissionState: 'prompt',
      message:
        'Camera is in use by another app (e.g. Zoom, FaceTime, or another tab). Close other apps and retry.',
    };
  }

  if (errName === 'overconstrainederror' || errStr.includes('overconstrained')) {
    return {
      permissionState: 'prompt',
      message:
        'Selected camera does not support required video constraints. Try selecting a different camera.',
    };
  }

  if (
    errName === 'securityerror' ||
    errStr.includes('secure context') ||
    errStr.includes('https')
  ) {
    return {
      permissionState: 'prompt',
      message: 'Camera access requires a secure HTTPS or localhost connection.',
    };
  }

  if (errName === 'aborterror' || errStr.includes('aborted')) {
    return {
      permissionState: 'prompt',
      message: 'Camera initialization was cancelled or interrupted.',
    };
  }

  return {
    permissionState: 'prompt',
    message:
      err?.message ||
      'Unable to access camera. Please check your browser device settings or use Manual Verify.',
  };
}

export const safeStopScanner = async (
  scanner: any,
  containerId: string = 'scanner-preview-container'
) => {
  if (scanner) {
    try {
      const isScanning =
        typeof scanner.getState === 'function'
          ? scanner.getState() === 2
          : Boolean(scanner.isScanning);
      if (isScanning) {
        await scanner.stop();
      }
    } catch {
      // Absorb transition errors
    }
  }

  // Force stop and release all MediaStream tracks from any video element in the container
  if (typeof document !== 'undefined') {
    const container = document.getElementById(containerId);
    if (container) {
      const videoElements = container.querySelectorAll('video');
      videoElements.forEach((video) => {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach((track) => {
            track.stop();
          });
          video.srcObject = null;
        }
      });
    }
  }
};
