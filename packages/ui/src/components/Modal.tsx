'use client';

import React, { type ReactNode, useRef } from 'react';

import { useFocusTrap } from '../hooks/useFocusTrap';

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
