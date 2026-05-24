'use client';

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

import { extractApiError, ApiError } from '@/lib/api/client';

/**
 * Generic query hook wrapping React Query with consistent error handling
 */
export function useApi<TData>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, ApiError>({
    queryKey,
    queryFn: async () => {
      try {
        return await queryFn();
      } catch (err) {
        throw extractApiError(err);
      }
    },
    ...options,
  });
}

/**
 * Generic mutation hook wrapping React Query
 */
export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, ApiError, TVariables>, 'mutationFn'>
) {
  return useMutation<TData, ApiError, TVariables>({
    mutationFn: async (variables) => {
      try {
        return await mutationFn(variables);
      } catch (err) {
        throw extractApiError(err);
      }
    },
    ...options,
  });
}
