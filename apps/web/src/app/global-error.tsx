'use client';

import { useEffect, useRef, useState } from 'react';

import { GlobalErrorContent } from './_components/GlobalErrorContent';
import {
  isChunkLoadFailure,
  isBuildMismatchChunkFailure,
  getChunkRecoveryTimestamp,
  setChunkRecoveryTimestamp,
} from '@/lib/utils/chunk-recovery';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const autoReloadAttempted = useRef(false);

  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const [isAutoReloading, setIsAutoReloading] = useState(false);

  const isChunk = isChunkLoadFailure(error);
  const isBuildMismatch = isBuildMismatchChunkFailure(error);

  useEffect(() => {
    if (!isChunk) {
      console.error('[MAD Global Error]', error);
    }
  }, [error, isChunk]);

  useEffect(() => {
    if (isChunk) {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!online) {
        setIsOffline(true);
        console.error('[MAD Chunk Recovery] Global chunk failure detected while offline.', {
          errorName: error.name,
          errorMessage: error.message,
          onLine: false,
          pathname: typeof window !== 'undefined' ? window.location.pathname : '',
          recoveryMode: 'offline',
        });
        return;
      }

      const lastAttempt = getChunkRecoveryTimestamp();
      const now = Date.now();
      const cooldownWindow = 10000; // 10 seconds

      if (lastAttempt && now - parseInt(lastAttempt, 10) < cooldownWindow) {
        setIsCooldownActive(true);
        console.error('[MAD Chunk Recovery] Global chunk failure cooldown active.', {
          errorName: error.name,
          errorMessage: error.message,
          onLine: true,
          pathname: typeof window !== 'undefined' ? window.location.pathname : '',
          recoveryMode: 'cooldown',
        });
        return;
      }

      if (!autoReloadAttempted.current) {
        autoReloadAttempted.current = true;
        setIsAutoReloading(true);
        setChunkRecoveryTimestamp(now.toString());

        console.error('[MAD Chunk Recovery] Triggering automatic global page reload for chunk recovery.', {
          errorName: error.name,
          errorMessage: error.message,
          onLine: true,
          pathname: typeof window !== 'undefined' ? window.location.pathname : '',
          recoveryMode: 'auto-reload',
        });

        const timer = setTimeout(() => {
          window.location.reload();
        }, 800);

        return () => clearTimeout(timer);
      }
    }
  }, [isChunk, error]);

  const handleForceReload = () => {
    console.error('[MAD Chunk Recovery] Executing global manual force reload.', {
      errorName: error.name,
      errorMessage: error.message,
      onLine: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pathname: typeof window !== 'undefined' ? window.location.pathname : '',
      recoveryMode: 'manual-force-reload',
    });
    window.location.reload();
  };

  const handleOfflineRetry = () => {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!online) {
      setIsOffline(true);
      return;
    }
    handleForceReload();
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#0B0F1A',
          color: '#E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <GlobalErrorContent
          error={error}
          isChunk={isChunk}
          isOffline={isOffline}
          isAutoReloading={isAutoReloading}
          isCooldownActive={isCooldownActive}
          isBuildMismatch={isBuildMismatch}
          onReset={reset}
          onOfflineRetry={handleOfflineRetry}
          onForceReload={handleForceReload}
        />
      </body>
    </html>
  );
}
