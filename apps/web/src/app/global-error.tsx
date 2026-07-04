'use client';

import { useEffect, useRef, useState } from 'react';

import { isChunkLoadFailure, isBuildMismatchChunkFailure, getChunkRecoveryTimestamp, setChunkRecoveryTimestamp } from '@/lib/utils/chunk-recovery';

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

  const handleNormalReset = () => {
    reset();
  };

  // ─── Render Helper Contexts ─────────────────────────────────

  let title = 'Critical Error';
  let description = 'The app encountered a fatal error and could not recover. Please try refreshing the page.';
  let primaryAction = (
    <button
      onClick={handleNormalReset}
      style={{
        padding: '0.75rem 1.5rem',
        background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
        color: '#fff',
        border: 'none',
        borderRadius: '0.75rem',
        fontWeight: 700,
        cursor: 'pointer',
        fontSize: '0.875rem',
      }}
    >
      Try Again
    </button>
  );
  let icon = '🔇';

  if (isChunk) {
    if (isOffline) {
      icon = '🎧';
      title = 'DJ Booth Lost Connection';
      description = "Looks like the sound system can't reach the venue right now. Some live features are temporarily unavailable until your internet connection returns.";
      primaryAction = (
        <button
          onClick={handleOfflineRetry}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Retry Connection
        </button>
      );
    } else if (isAutoReloading) {
      icon = '🔄';
      title = 'Loading Updates';
      description = 'A new update or component is loading. Just a moment...';
      primaryAction = (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem' }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            border: '4px solid #ec4899',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );
    } else if (isCooldownActive) {
      icon = '⚠️';
      title = 'Loading Issue';
      description = 'We are having trouble loading some parts of the app. A reload might help.';
      primaryAction = (
        <button
          onClick={handleForceReload}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Force Reload App
        </button>
      );
    } else if (isBuildMismatch) {
      icon = '🆕';
      title = 'New Version Available';
      description = 'A new version of MAD is available. Reload to continue.';
      primaryAction = (
        <button
          onClick={handleForceReload}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Reload App
        </button>
      );
    }
  }

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
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{icon}</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>
          {title}
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem', maxWidth: '400px' }}>
          {description}
          {error?.digest && (
            <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748b' }}>
              ID: {error.digest}
            </span>
          )}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {primaryAction}
          <a
            href="/"
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.75rem',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Go Home
          </a>
        </div>
      </body>
    </html>
  );
}
