'use client';

import { type ButtonHTMLAttributes, type ReactNode, useEffect, useRef } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function Button({
  className = '',
  type = 'button',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${fullWidth ? 'w-full ' : ''}${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Loading...' : leftIcon}
      {children}
      {!isLoading ? rightIcon : null}
    </button>
  );
}

export function EventGridSkeleton({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-72 animate-pulse rounded-2xl bg-white/10" />
      ))}
    </div>
  );
}

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

      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
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
  }, [isActive, onClose, shouldRestoreFocus]);

  return containerRef;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: string;
  showCloseButton?: boolean;
  children?: ReactNode;
  closeOnBackdropClick?: boolean;
  enableSwipeToClose?: boolean;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

export function Modal({
  isOpen,
  onClose,
  size,
  showCloseButton,
  children,
  closeOnBackdropClick = false,
  enableSwipeToClose = false,
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onClose,
  });

  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const touchCurrentY = useRef(0);
  const isDragging = useRef(false);

  if (!isOpen) return null;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!enableSwipeToClose) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    isDragging.current = true;
    e.currentTarget.style.transition = 'none';
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!enableSwipeToClose || !isDragging.current) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - touchStartY.current;

    // Only allow dragging downwards
    if (diffY > 0) {
      touchCurrentY.current = diffY;
      e.currentTarget.style.transform = `translateY(${diffY}px)`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!enableSwipeToClose || !isDragging.current) return;
    isDragging.current = false;

    const diffY = touchCurrentY.current;
    const duration = Date.now() - touchStartTime.current;
    const velocity = duration > 0 ? diffY / duration : 0; // px/ms
    const element = e.currentTarget;

    // Thresholds: distance > 120px AND velocity > 0.5px/ms
    if (diffY > 120 && velocity > 0.5) {
      element.style.transition = 'transform 0.2s ease-out';
      element.style.transform = 'translateY(100%)';
      setTimeout(() => {
        onClose();
      }, 200);
    } else {
      // Reset position with a nice spring-like ease
      element.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      element.style.transform = 'translateY(0)';
    }

    touchCurrentY.current = 0;
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 ${
        closeOnBackdropClick ? 'cursor-pointer' : ''
      }`}
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="bg-background relative w-full max-w-md rounded-2xl p-6 shadow-2xl focus:outline-none cursor-default"
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-white w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export function ScrollIndicator() {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none select-none">
      <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold animate-pulse">Scroll</span>
      <div className="w-5 h-8 rounded-full border border-white/20 flex justify-center p-1 bg-black/10 backdrop-blur-[2px]">
        <div className="w-1 h-1.5 bg-accent-purple rounded-full animate-scroll-dot" />
      </div>
    </div>
  );
}

export function ArrowRight({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowLeft({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}



