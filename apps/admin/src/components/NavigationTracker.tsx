'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
// Sentry import removed for client-side telemetry isolation

export default function NavigationTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      console.log('Navigation breadcrumb:', pathname);
    }
  }, [pathname]);

  return null;
}
