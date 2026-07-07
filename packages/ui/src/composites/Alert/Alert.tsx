import React, { forwardRef } from 'react';

import {
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
} from '../../icons';
import { cn } from '../../lib/cn';
import { IconButton } from '../../primitives/IconButton';
import {
  alertContainerClasses,
  alertVariants,
  alertIconClasses,
  alertTitleClasses,
  alertContentClasses,
  alertCloseClasses,
} from './Alert.styles';
import type { AlertProps } from './Alert.types';

const defaultIcons = {
  info: <Info className={alertIconClasses} />,
  success: <CheckCircle2 className={alertIconClasses} />,
  warning: <AlertTriangle className={alertIconClasses} />,
  danger: <AlertCircle className={alertIconClasses} />,
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', title, onDismiss, icon, children, ...props }, ref) => {
    const activeIcon = icon !== undefined ? icon : defaultIcons[variant];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertContainerClasses, alertVariants[variant], className)}
        {...props}
      >
        {activeIcon && <div className="shrink-0">{activeIcon}</div>}
        <div className={alertContentClasses}>
          {title && <h5 className={alertTitleClasses}>{title}</h5>}
          <div>{children}</div>
        </div>
        {onDismiss && (
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Dismiss alert"
            onClick={onDismiss}
            className={alertCloseClasses}
          >
            <X className="h-4 w-4" />
          </IconButton>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
