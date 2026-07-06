import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../../primitives/Button';
import { AlertTriangle } from '../../icons';
import { ErrorStateProps } from './ErrorState.types';
import {
  errorStateContainerClasses,
  errorStateIconClasses,
  errorStateTitleClasses,
  errorStateDescriptionClasses,
  errorStateActionClasses,
} from './ErrorState.styles';

export const ErrorState = forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ className, title, description, icon, onRetry, action, ...props }, ref) => {
    const activeIcon = icon !== undefined ? icon : <AlertTriangle className={errorStateIconClasses} />;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(errorStateContainerClasses, className)}
        {...props}
      >
        {activeIcon && <div className="shrink-0">{activeIcon}</div>}
        <h4 className={errorStateTitleClasses}>{title}</h4>
        {description && <p className={errorStateDescriptionClasses}>{description}</p>}
        {(action || onRetry) && (
          <div className={errorStateActionClasses}>
            {action !== undefined ? (
              action
            ) : (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);

ErrorState.displayName = 'ErrorState';
