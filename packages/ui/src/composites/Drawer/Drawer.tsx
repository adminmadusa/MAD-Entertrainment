'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { IconButton } from '../../primitives/IconButton';
import { X } from '../../icons';
import { DrawerProps } from './Drawer.types';
import {
  drawerBackdropClasses,
  drawerContentBaseClasses,
  drawerSides,
  drawerHeaderClasses,
  drawerTitleClasses,
  drawerBodyClasses,
  drawerCloseClasses,
} from './Drawer.styles';

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(
  ({ isOpen, onClose, side = 'right', title, children }, ref) => {
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
          className={cn(drawerContentBaseClasses, drawerSides[side])}
        >
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
          <div className={drawerBodyClasses}>{children}</div>
        </div>
      </>
    );
  }
);

Drawer.displayName = 'Drawer';
