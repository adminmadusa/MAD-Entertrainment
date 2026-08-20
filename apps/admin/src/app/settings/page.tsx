'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/ticket-management?tab=categories');
  }, [router]);

  return (
    <div className="max-w-xl mx-auto py-16 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 text-accent-purple-light flex items-center justify-center mx-auto animate-pulse">
        <span className="text-xl">⚙️</span>
      </div>
      <h1 className="text-xl font-bold text-white">Redirecting to Ticket Management...</h1>
      <p className="text-text-muted text-sm">
        Category and configuration settings have been moved to Ticket Management.
      </p>
      <div>
        <Link
          href="/ticket-management?tab=categories"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-accent-purple text-white text-sm font-semibold hover:bg-accent-purple/90 transition-colors shadow-glow-sm"
        >
          Go to Event Categories
        </Link>
      </div>
    </div>
  );
}
