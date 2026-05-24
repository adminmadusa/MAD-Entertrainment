'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

import { AuthProvider } from './auth.provider';
import { SocketProvider } from './socket.provider';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (process.env.NODE_ENV !== 'production') {
              console.debug('[react-query] query error', { queryKey: query.queryKey, error });
            }
          },
        }),
        mutationCache: new MutationCache({
          onSuccess: (_data, _variables, _context, mutation) => {
            if (process.env.NODE_ENV !== 'production') {
              console.debug('[react-query] mutation success', { mutationKey: mutation.options.mutationKey });
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 0,
            gcTime: 1000 * 60 * 5,
            retry: 2,
            refetchOnMount: true,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </AuthProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
