'use client';

import { useState, useEffect } from 'react';


/**
 * Decouples React unmount from CSS transition completion, enabling exit animations.
 *
 * Returns `isRendered` (controls DOM presence) and `isVisible` (drives CSS transition classes).
 *
 * The component owns its animation timing by passing explicit durations from `MotionTokens`.
 * This hook never embeds magic numbers.
 *
 * @param isOpen       - The controlled open/close state from the parent.
 * @param enterDuration - Duration (ms) to wait before setting visible on enter. Defaults to 0 (next frame).
 * @param exitDuration  - Duration (ms) to keep the element in the DOM after visibility is removed.
 *
 * @example
 * ```tsx
 * import { MotionTokens } from '../lib/motionTokens';
 * const { isRendered, isVisible } = useDelayedUnmount(isOpen, 0, MotionTokens.modal.exit);
 * if (!isRendered) return null;
 * return <div className={isVisible ? 'opacity-100' : 'opacity-0'} />;
 * ```
 *
 * Ownership: @mad/ui (packages/ui)
 * Consumers: Modal, Drawer
 */
export function useDelayedUnmount(
  isOpen: boolean,
  enterDuration: number = 0,
  exitDuration: number = 150,
): { isRendered: boolean; isVisible: boolean } {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Defer visibility to the next frame (or after enterDuration) to allow
      // the browser to paint the initial state before applying the enter transition.
      const timer = enterDuration > 0
        ? setTimeout(() => setIsVisible(true), enterDuration)
        : requestAnimationFrame(() => setIsVisible(true)) as unknown as ReturnType<typeof setTimeout>;
      return () => clearTimeout(timer);
    } else {
      // Trigger exit transition first, then remove from DOM after it completes.
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), exitDuration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, enterDuration, exitDuration]);

  return { isRendered, isVisible };
}
