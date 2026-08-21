'use client';

import React, { useEffect, useRef } from 'react';

import { useDelayedUnmount } from '../../hooks/useDelayedUnmount';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { X } from '../../icons';
import { cn } from '../../lib/cn';
import { MotionTokens } from '../../lib/motionTokens';
import { IconButton } from '../../primitives/IconButton';
import {
  modalSizes,
  modalBackdropBaseClasses,
  modalBackdropPresentations,
  modalContentBaseClasses,
  modalContentPresentations,
  modalContentInitialStates,
  modalContentActiveStates,
  modalCloseButtonClasses,
  modalCloseIconClasses,
  modalDragHandleClasses,
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
  presentation = 'centered',
  ariaLabelledBy,
  ariaDescribedBy,
  className,
  lockScroll = true,
}: ModalProps) {
  const { isRendered, isVisible } = useDelayedUnmount(
    isOpen,
    0,
    MotionTokens.modal.exit,
  );

  const modalRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onClose,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen || !lockScroll) return;

    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle === 'hidden' ? '' : originalStyle;
    };
  }, [isOpen, lockScroll]);

  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const touchCurrentY = useRef(0);
  const isDragging = useRef(false);

  if (!isRendered) return null;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!enableSwipeToClose || presentation !== 'bottom-sheet') return;
    if (e.currentTarget.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    isDragging.current = true;
    e.currentTarget.style.transition = 'none';
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!enableSwipeToClose || presentation !== 'bottom-sheet' || !isDragging.current) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - touchStartY.current;

    if (diffY > 0) {
      touchCurrentY.current = diffY;
      e.currentTarget.style.transform = `translateY(${diffY}px)`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!enableSwipeToClose || presentation !== 'bottom-sheet' || !isDragging.current) return;
    isDragging.current = false;

    const diffY = touchCurrentY.current;
    const duration = Date.now() - touchStartTime.current;
    const velocity = duration > 0 ? diffY / duration : 0;
    const element = e.currentTarget;

    if (diffY > 120 && velocity > 0.5) {
      // Swipe dismiss: animate out then call onClose
      element.style.transition = `transform ${MotionTokens.modal.exit}ms ease-in`;
      element.style.transform = 'translateY(100%)';
      setTimeout(() => {
        onClose();
      }, MotionTokens.modal.exit);
    } else {
      // Swipe cancel: bounce back using design system bounce token
      element.style.transition = `transform ${MotionTokens.modal.enter}ms var(--transition-bounce)`;
      element.style.transform = 'translateY(0)';
    }

    touchCurrentY.current = 0;
  };

  return (
    <div
      className={cn(
        modalBackdropBaseClasses,
        modalBackdropPresentations[presentation],
        isVisible ? 'opacity-100' : 'opacity-0',
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
          modalContentBaseClasses,
          modalContentPresentations[presentation],
          isVisible ? modalContentActiveStates[presentation] : modalContentInitialStates[presentation],
          modalSizes[size],
          className
        )}
      >
        {presentation === 'bottom-sheet' && (
          <div className={modalDragHandleClasses} aria-hidden="true" />
        )}
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
