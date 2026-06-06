'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  isChunkLoadFailure,
  isBuildMismatchChunkFailure,
  getChunkRecoveryTimestamp,
  setChunkRecoveryTimestamp,
} from '@/lib/utils/chunk-recovery';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const router = useRouter();
  const autoReloadAttempted = useRef(false);

  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const [isAutoReloading, setIsAutoReloading] = useState(false);

  const isChunk = isChunkLoadFailure(error);
  const isBuildMismatch = isBuildMismatchChunkFailure(error);

  useEffect(() => {
    // Log normal errors to tracking service (e.g. Sentry)
    if (!isChunk) {
      console.error('[MAD Error Boundary]', error);
    }
  }, [error, isChunk]);

  useEffect(() => {
    if (isChunk) {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!online) {
        setIsOffline(true);
        console.error('[MAD Chunk Recovery] Chunk failure detected while offline.', {
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
        console.error('[MAD Chunk Recovery] Chunk failure cooldown active.', {
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

        console.error('[MAD Chunk Recovery] Triggering automatic page reload for chunk recovery.', {
          errorName: error.name,
          errorMessage: error.message,
          onLine: true,
          pathname: typeof window !== 'undefined' ? window.location.pathname : '',
          recoveryMode: 'auto-reload',
        });

        // 800ms delayed reload to let UI render and avoid synchronous locks
        const timer = setTimeout(() => {
          window.location.reload();
        }, 800);

        return () => clearTimeout(timer);
      }
    }
  }, [isChunk, error]);

  const handleForceReload = () => {
    console.error('[MAD Chunk Recovery] Executing manual force reload.', {
      errorName: error.name,
      errorMessage: error.message,
      onLine: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pathname: typeof window !== 'undefined' ? window.location.pathname : '',
      recoveryMode: 'manual-force-reload',
    });
    window.location.reload();
  };

  const handleOfflineRetry = () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      alert('You still appear to be offline. Please reconnect and try again.');
      return;
    }
    handleForceReload();
  };

  const handleNormalReset = () => {
    reset();
    router.refresh();
  };

  // ─── Render Helper Contexts ─────────────────────────────────

  let title = (
    <>
      Something Went <span className="text-gradient">Wrong</span>
    </>
  );
  let description = 'The DJ dropped the laptop. An unexpected error crashed the page.';
  let primaryAction = (
    <button
      onClick={handleNormalReset}
      className="px-6 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow text-sm"
    >
      Try Again
    </button>
  );
  let icon = '🎛️';

  if (isChunk) {
    if (isOffline) {
      icon = '📡';
      title = (
        <>
          Connection <span className="text-gradient">Lost</span>
        </>
      );
      description = 'You are currently offline. Please check your connection and try again.';
      primaryAction = (
        <button
          onClick={handleOfflineRetry}
          className="px-6 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow text-sm"
        >
          Check Connection & Retry
        </button>
      );
    } else if (isAutoReloading) {
      icon = '🔄';
      title = (
        <>
          Loading <span className="text-gradient">Updates</span>
        </>
      );
      description = 'A new update or component is loading. Just a moment...';
      primaryAction = (
        <div className="flex justify-center items-center py-2">
          <div className="w-8 h-8 border-4 border-accent-pink border-t-transparent rounded-full animate-spin" />
        </div>
      );
    } else if (isCooldownActive) {
      icon = '⚠️';
      title = (
        <>
          Loading <span className="text-gradient">Issue</span>
        </>
      );
      description = 'We are having trouble loading some parts of the app. A reload might help.';
      primaryAction = (
        <button
          onClick={handleForceReload}
          className="px-6 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow text-sm"
        >
          Force Reload App
        </button>
      );
    } else if (isBuildMismatch) {
      icon = '🆕';
      title = (
        <>
          New Version <span className="text-gradient">Available</span>
        </>
      );
      description = 'A new version of MAD is available. Reload to continue.';
      primaryAction = (
        <button
          onClick={handleForceReload}
          className="px-6 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow text-sm"
        >
          Reload App
        </button>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent-pink/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-md space-y-6">
        {/* Icon */}
        <div className={`text-6xl ${isAutoReloading ? 'animate-spin duration-1000' : 'animate-pulse'}`}>
          {icon}
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-black text-white">{title}</h1>

        <p className="text-text-secondary text-sm leading-relaxed">
          {description}
          {error?.digest && (
            <span className="block mt-2 font-mono text-xs text-text-muted">
              Error ID: {error.digest}
            </span>
          )}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          {primaryAction}
          <a
            href="/"
            className="px-6 py-3 glass border border-border-subtle text-white font-semibold rounded-xl hover:border-accent-purple/40 transition-all text-sm"
          >
            Return Home
          </a>
        </div>
      </div>
    </div>
  );
}

