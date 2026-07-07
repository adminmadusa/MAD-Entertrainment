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
  ({ className, title, description, message, icon, onRetry, retry, action, ...props }, ref) => {
    const activeIcon = icon !== undefined ? icon : <AlertTriangle className={errorStateIconClasses} />;
    const activeTitle = title || message || 'Something went wrong.';
    const activeDescription = (title || message) ? description : undefined;
    const activeRetry = onRetry || retry;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(errorStateContainerClasses, className)}
        {...props}
      >
        {activeIcon && <div className="shrink-0">{activeIcon}</div>}
        <h4 className={errorStateTitleClasses}>{activeTitle}</h4>
        {activeDescription && <p className={errorStateDescriptionClasses}>{activeDescription}</p>}
        {(action || activeRetry) && (
          <div className={errorStateActionClasses}>
            {action !== undefined ? (
              action
            ) : (
              <Button variant="outline" size="sm" onClick={activeRetry}>
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
