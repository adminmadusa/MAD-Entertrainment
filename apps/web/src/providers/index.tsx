'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';

import { AuthProvider } from './AuthProvider';
interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30,   // 30 minutes
            retry: 2,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const activeEl = document.activeElement;
      if (!activeEl) return;

      const isInputFocused =
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable;

      if (!isInputFocused) return;

      const target = e.target as HTMLElement;
      // Do not blur if user taps another form element or interactive control
      const isInteractive =
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'OPTION' ||
        target.isContentEditable ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('label') ||
        target.closest('select') ||
        target.closest('[role="listbox"]') ||
        target.closest('[role="combobox"]') ||
        target.closest('[role="dialog"]');

      if (!isInteractive) {
        (activeEl as HTMLElement).blur();
      }
    };

    document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    document.addEventListener('mousedown', handleOutsideClick, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
