'use client';

import ErrorBoundary from '@/components/ErrorBoundary';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="bg-background text-text-primary antialiased min-h-screen flex items-center justify-center">
      <ErrorBoundary>
        <div className="glass-strong rounded-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
          <p className="text-text-muted mb-6">{error?.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => {
              reset();
            }}
            className="px-4 py-2 bg-accent-purple hover:bg-accent-purple/80 text-white rounded"
          >
            Try again
          </button>
        </div>
      </ErrorBoundary>
    </div>
  );
}
