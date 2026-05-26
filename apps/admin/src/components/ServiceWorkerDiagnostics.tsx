'use client';

import { useEffect } from 'react';

const CACHE_VERSION_KEY = 'mad_admin_cache_version';

export function ServiceWorkerDiagnostics() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const cacheVersion = process.env.NEXT_PUBLIC_CACHE_VERSION ?? process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';
    const currentVersion = localStorage.getItem(CACHE_VERSION_KEY);

    const inspect = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[service-worker] diagnostics', {
          cacheVersion,
          currentVersion,
          registrations: registrations.map((registration) => registration.active?.scriptURL ?? registration.scope),
        });
      }

      if (!currentVersion) {
        localStorage.setItem(CACHE_VERSION_KEY, cacheVersion);
        return;
      }

      if (currentVersion === cacheVersion) return;

      await Promise.all(registrations.map((registration) => registration.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      localStorage.setItem(CACHE_VERSION_KEY, cacheVersion);
      window.location.reload();
    };

    inspect().catch((error) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[service-worker] diagnostics failed', error);
      }
    });
  }, []);

  return null;
}
