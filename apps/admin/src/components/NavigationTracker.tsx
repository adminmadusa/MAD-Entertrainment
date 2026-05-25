'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
// Sentry import removed for client-side telemetry isolation

export default function NavigationTracker() {
  const pathname = usePathname();

    // Breadcrumb tracking hook (can integrate with central logger if needed)

  return null;
}
