import Link from 'next/link';

export function DiagnosticsAccessDenied() {
  return (
    <div className="py-12 text-center max-w-md mx-auto space-y-4">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center text-2xl mx-auto">
        ⚠️
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-white">Access Denied</h1>
        <p className="text-text-muted text-sm leading-relaxed">
          You do not have the required administrative permissions to access the diagnostics workspace.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-block px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl border border-border-subtle transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
