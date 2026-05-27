/**
 * useWindowWidth — SSR-safe responsive breakpoint hook
 *
 * ✅ SAFE: starts with a server-side default (1024) so SSR and first
 *          render produce identical HTML. Updates via useEffect on mount.
 *
 * ❌ NEVER do: `window.innerWidth` directly in render/JSX —
 *    that causes "TypeError: Cannot read properties of undefined
 *    (reading 'call')" hydration crash in Next.js App Router.
 *
 * Usage:
 *   const windowWidth = useWindowWidth();
 *   const isMobile = windowWidth < 640;
 */

import { useState, useEffect } from "react";

/**
 * Returns the current window.innerWidth, updating on resize.
 * Defaults to 1024 during SSR so server/client HTML stays identical.
 */
export function useWindowWidth(defaultWidth = 1024): number {
  const [width, setWidth] = useState(defaultWidth);

  useEffect(() => {
    // Set real width immediately on mount
    setWidth(window.innerWidth);

    let rafId: number;

    // requestAnimationFrame throttles resize events to ~60 fps.
    // Without this, every pixel of window dragging fires a setState,
    // causing 60+ re-renders per second in every consumer of this hook.
    const handler = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setWidth(window.innerWidth));
    };

    window.addEventListener("resize", handler, { passive: true });
    return () => {
      window.removeEventListener("resize", handler);
      cancelAnimationFrame(rafId); // prevent stale update after unmount
    };
  }, []);

  return width;
}

/**
 * Returns true if the screen is narrower than the given breakpoint.
 * Tailwind breakpoints: sm=640, md=768, lg=1024, xl=1280, 2xl=1536
 *
 * ⚠️ Prefer CSS/Tailwind responsive classes when possible — this hook
 *    triggers a re-render on every resize event.
 */
export function useIsMobile(breakpoint = 640): boolean {
  return useWindowWidth() < breakpoint;
}

/**
 * Returns true only after the component has hydrated on the client.
 * Use this as a guard before rendering any browser-only content.
 *
 * Pattern:
 *   const mounted = useMounted();
 *   if (!mounted) return <Skeleton />;
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
