/* @vitest-environment jsdom */

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useFormMutation } from "../use-form-mutation";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("useFormMutation integration", () => {
  beforeEach(() => {
    push.mockReset();
  });

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );
    Wrapper.displayName = "QueryClientTestWrapper";
    return Wrapper;
  };

  it("exposes pending state during submit and completes success lifecycle", async () => {
    let resolveMutation: ((value: { id: string }) => void) | undefined;

    const mutationFn = vi.fn(
      () =>
        new Promise<{ id: string }>((resolve) => {
          resolveMutation = resolve;
        }),
    );

    const onSuccess = vi.fn(async () => undefined);

    const { result } = renderHook(
      () =>
        useFormMutation({
          mutationFn,
          onSuccess,
          redirectTo: "/events",
        }),
      { wrapper: createWrapper() },
    );

    let submitPromise: Promise<void>;
    await act(async () => {
      submitPromise = result.current.submit({ name: "foo" });
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    await act(async () => {
      resolveMutation?.({ id: "evt_1" });
    });

    await submitPromise!;
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/events");
  });

  it("normalizes errors and calls onError callback", async () => {
    const onError = vi.fn(async () => undefined);

    const { result } = renderHook(
      () =>
        useFormMutation({
          mutationFn: async () => {
            throw new Error("Request failed");
          },
          onError,
        }),
      { wrapper: createWrapper() },
    );

    await expect(result.current.submit({})).rejects.toThrow("Request failed");

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
      expect(result.current.serverError).toContain("Request failed");
    });
  });

  it("retries failed mutations when retry policy allows it", async () => {
    const mutationFn = vi
      .fn<() => Promise<{ ok: true }>>()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(
      () =>
        useFormMutation({
          mutationFn,
          retry: 1,
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.submit({});
    });

    expect(mutationFn).toHaveBeenCalledTimes(2);
  });

  it("does not redirect when redirect target is not provided", async () => {
    const { result } = renderHook(
      () =>
        useFormMutation({
          mutationFn: async () => ({ ok: true }),
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.submit({});
    });

    expect(push).not.toHaveBeenCalled();
  });
});
