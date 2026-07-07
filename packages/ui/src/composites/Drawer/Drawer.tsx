'use client';

import React, { forwardRef } from 'react';

import { useFocusTrap } from '../../hooks/useFocusTrap';
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
import type { DrawerProps } from './Drawer.types';

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(
  ({ isOpen, onClose, side = 'right', title, children, className, showHeader = true }, ref) => {
    const drawerRef = useFocusTrap<HTMLDivElement>({
      isActive: isOpen,
      onClose,
    });

    if (!isOpen) return null;

    return (
      <>
        <div
          className={drawerBackdropClasses}
          onClick={onClose}
        />
        <div
          ref={drawerRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          className={cn(drawerContentBaseClasses, drawerSides[side], className)}
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
