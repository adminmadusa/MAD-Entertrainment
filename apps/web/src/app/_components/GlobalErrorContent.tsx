'use client';

import React from 'react';

export interface GlobalErrorContentProps {
  error: Error & { digest?: string };
  isChunk: boolean;
  isOffline: boolean;
  isAutoReloading: boolean;
  isCooldownActive: boolean;
  isBuildMismatch: boolean;
  onReset: () => void;
  onOfflineRetry: () => void;
  onForceReload: () => void;
}

export function GlobalErrorContent({
  error,
  isChunk,
  isOffline,
  isAutoReloading,
  isCooldownActive,
  isBuildMismatch,
  onReset,
  onOfflineRetry,
  onForceReload,
}: GlobalErrorContentProps) {
  let title = 'Critical Error';
  let description = 'The app encountered a fatal error and could not recover. Please try refreshing the page.';
  let primaryAction = (
    <button
      onClick={onReset}
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
          onClick={onOfflineRetry}
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
          <div
            style={{
              width: '2rem',
              height: '2rem',
              border: '4px solid #ec4899',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
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
          onClick={onForceReload}
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
          onClick={onForceReload}
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
    <>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{icon}</div>
      <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>
        {title}
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '1.5rem', maxWidth: '400px' }}>
        {description}
        {error?.digest && (
          <span
            style={{
              display: 'block',
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              color: '#64748b',
            }}
          >
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
    </>
  );
}
