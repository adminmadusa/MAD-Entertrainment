'use client';

import React, { useRef } from 'react';

import { useFocusTrap } from '../../hooks/useFocusTrap';
import { X } from '../../icons';
import { cn } from '../../lib/cn';
import { IconButton } from '../../primitives/IconButton';
import {
  modalSizes,
  modalBackdropClasses,
  modalContentClasses,
  modalCloseButtonClasses,
  modalCloseIconClasses,
} from './Modal.styles';
import type { ModalProps } from './Modal.types';

export function Modal({
  isOpen,
  onClose,
  size = 'md',
  showCloseButton = false,
  children,
  closeOnBackdropClick = false,
  enableSwipeToClose = false,
  ariaLabelledBy,
  ariaDescribedBy,
  className,
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
    const velocity = duration > 0 ? diffY / duration : 0;
    const element = e.currentTarget;

    if (diffY > 120 && velocity > 0.5) {
      element.style.transition = 'transform 0.2s ease-out';
      element.style.transform = 'translateY(100%)';
      setTimeout(() => {
        onClose();
      }, 200);
    } else {
      element.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      element.style.transform = 'translateY(0)';
    }

    touchCurrentY.current = 0;
  };

  return (
    <div
      className={cn(
        modalBackdropClasses,
        closeOnBackdropClick && 'cursor-pointer'
      )}
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
        className={cn(
          modalContentClasses,
          modalSizes[size],
          className
        )}
      >
        {showCloseButton && (
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Close dialog"
            onClick={onClose}
            className={modalCloseButtonClasses}
          >
            <X className={modalCloseIconClasses} />
          </IconButton>
        )}
        {children}
      </div>
    </div>
  );
}

Modal.displayName = 'Modal';
