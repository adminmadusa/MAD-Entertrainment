'use client';

import React, { forwardRef } from 'react';

import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useDelayedUnmount } from '../../hooks/useDelayedUnmount';
import { MotionTokens } from '../../lib/motionTokens';
import { X } from '../../icons';
import { cn } from '../../lib/cn';
import { IconButton } from '../../primitives/IconButton';
import {
  drawerBackdropClasses,
  drawerContentBaseClasses,
  drawerSides,
  drawerHeaderClasses,
  drawerTitleClasses,
  drawerBodyClasses,
  drawerCloseClasses,
} from './Drawer.styles';
import type { DrawerProps } from './Drawer.types'

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(
  ({ isOpen, onClose, side = 'right', title, children, className, showHeader = true, id }, ref) => {
    const { isRendered, isVisible } = useDelayedUnmount(
      isOpen,
      0,
      MotionTokens.drawer.exit,
    );

    const drawerRef = useFocusTrap<HTMLDivElement>({
      isActive: isOpen,
      onClose,
    });

    if (!isRendered) return null;

    return (
      <>
        {/* Backdrop removed per user request */}
        <div
          ref={drawerRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
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
                <h5 className={drawerTitleClasses}>{title}</h5>
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
