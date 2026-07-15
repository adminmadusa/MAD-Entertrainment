'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MotionConfig } from 'framer-motion';
import { useState } from 'react';

import { AdminAuthProvider } from './AdminAuthProvider';

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

  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <AdminAuthProvider>
          {children}
        </AdminAuthProvider>
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </MotionConfig>
  );
}
