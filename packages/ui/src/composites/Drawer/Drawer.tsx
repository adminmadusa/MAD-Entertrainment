'use client';

import { forwardRef, useEffect, useRef } from 'react';

import { useDelayedUnmount } from '../../hooks/useDelayedUnmount';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { X } from '../../icons';
import { cn } from '../../lib/cn';
import { MotionTokens } from '../../lib/motionTokens';
import { IconButton } from '../../primitives/IconButton';
import {
  drawerContentBaseClasses,
  drawerSides,
  drawerHeaderClasses,
  drawerTitleClasses,
  drawerBodyClasses,
  drawerCloseClasses,
} from './Drawer.styles';
import type { DrawerProps } from './Drawer.types'

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(
  ({ isOpen, onClose, side = 'right', title, children, className, showHeader = true, id, lockScroll = true }, _ref) => {
    const { isRendered, isVisible } = useDelayedUnmount(
      isOpen,
      0,
      MotionTokens.drawer.exit,
    );

    const drawerRef = useFocusTrap<HTMLDivElement>({
      isActive: isOpen,
      onClose,
    });

    const triggerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
      if (typeof window === 'undefined') return;

      if (isOpen) {
        triggerRef.current = document.activeElement as HTMLElement;
      } else {
        if (triggerRef.current) {
          triggerRef.current.focus();
          triggerRef.current = null;
        }
      }

      return () => {
        if (triggerRef.current) {
          triggerRef.current.focus();
        }
      };
    }, [isOpen]);

    useEffect(() => {
      if (typeof window === 'undefined' || !isOpen || !lockScroll) return;

      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalStyle;
      };
    }, [isOpen, lockScroll]);

    if (!isRendered) return null;

    const titleId = id ? `${id}-title` : undefined;

    return (
      <>
        {/* Backdrop removed per user request */}
        <div
          ref={drawerRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          id={id}
          className={cn(
            drawerContentBaseClasses,
            drawerSides[side],
            isVisible ? 'translate-x-0 opacity-100' : side === 'right' ? 'translate-x-full opacity-0' : side === 'left' ? '-translate-x-full opacity-0' : side === 'bottom' ? 'translate-y-full opacity-0' : '-translate-y-full opacity-0',
            className,
          )}
        >
          {showHeader && (
            <div className={drawerHeaderClasses}>
              {title ? (
                <h5 id={titleId} className={drawerTitleClasses}>{title}</h5>
              ) : (
                <div />
              )}
              <IconButton
                variant="ghost"
                size="sm"
                aria-label="Close drawer"
                onClick={onClose}
                className={drawerCloseClasses}
              >
                <X className="h-5 w-5" />
              </IconButton>
            </div>
          )}
          <div className={cn(drawerBodyClasses, !showHeader && 'p-0')}>{children}</div>
        </div>
      </>
    );
  }
);

Drawer.displayName = 'Drawer';
