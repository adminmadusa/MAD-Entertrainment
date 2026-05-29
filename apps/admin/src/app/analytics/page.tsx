'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AnalyticsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard?tab=analytics');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-purple-300 text-sm animate-pulse">
        Redirecting to dashboard analytics...
      </div>
    </div>
  );
}
