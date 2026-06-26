'use client';

import { useEffect, useRef } from 'react';

export interface UseFocusTrapOptions {
  isActive: boolean;
  onClose?: () => void;
  shouldRestoreFocus?: boolean;
}

export function useFocusTrap<T extends HTMLElement>({
  isActive,
  onClose,
  shouldRestoreFocus = true,
}: UseFocusTrapOptions) {
  const containerRef = useRef<T>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isActive) return;

    if (typeof document !== 'undefined') {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    }

    const container = containerRef.current;
    if (!container) return;

    const focusableSelectors = [
      'a[href]',
      'area[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      '[tabindex="0"]',
      '[contenteditable]',
    ].join(',');

    const focusableElements = Array.from(
      container.querySelectorAll<HTMLElement>(focusableSelectors)
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const elements = Array.from(
          container.querySelectorAll<HTMLElement>(focusableSelectors)
        );

        if (elements.length === 0) {
          e.preventDefault();
          return;
        }

        const first = elements[0];
        const last = elements[elements.length - 1];
        const activeEl = document.activeElement;

        // Prevent focus from escaping the container
        if (!container.contains(activeEl)) {
          if (e.shiftKey) {
            last.focus();
          } else {
            first.focus();
          }
          e.preventDefault();
        } else {
          if (e.shiftKey) {
            if (activeEl === first) {
              last.focus();
              e.preventDefault();
            }
          } else {
            if (activeEl === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      }

      if (e.key === 'Escape' && onCloseRef.current) {
        e.preventDefault();
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (shouldRestoreFocus && previousActiveElementRef.current) {
        const elementToFocus = previousActiveElementRef.current;
        setTimeout(() => {
          elementToFocus.focus();
        }, 0);
      }
    };
  }, [isActive, shouldRestoreFocus]);

  return containerRef;
}
