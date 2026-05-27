"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { extractApiError } from "@/lib/api/client";

interface UseFormMutationOptions<TPayload, TResult> {
  mutationFn: (payload: TPayload) => Promise<TResult>;
  retry?: number | boolean;
  redirectTo?: string;
  onSuccess?: (result: TResult) => void | Promise<void>;
  onError?: (error: unknown) => void | Promise<void>;
}

export function useFormMutation<TPayload, TResult>({
  mutationFn,
  retry,
  redirectTo,
  onSuccess,
  onError,
}: UseFormMutationOptions<TPayload, TResult>) {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn,
    retry,
    onSuccess: async (result) => {
      if (onSuccess) await onSuccess(result);
      if (redirectTo) router.push(redirectTo);
    },
    onError: async (error) => {
      if (onError) await onError(error);
    },
  });

  const serverError = useMemo(
    () => (mutation.error ? extractApiError(mutation.error).message : ""),
    [mutation.error],
  );

  const submit = async (payload: TPayload) => {
    await mutation.mutateAsync(payload);
  };

  return {
    submit,
    isPending: mutation.isPending,
    serverError,
    mutation,
  };
}
