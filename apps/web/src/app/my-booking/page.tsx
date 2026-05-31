'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function MyBookingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/tickets${window.location.search}`);
  }, [router]);

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background flex items-center justify-center">
      <div className="text-white/40 animate-pulse text-sm">Redirecting to tickets...</div>
    </div>
  );
}

export default function MyBookingPage() {
  return <MyBookingRedirect />;
}
