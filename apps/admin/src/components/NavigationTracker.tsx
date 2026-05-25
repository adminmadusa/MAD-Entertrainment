'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';

export default function NavigationTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: `Navigated to ${pathname}`,
        level: 'info',
      });
    }
  }, [pathname]);

  return null;
}
