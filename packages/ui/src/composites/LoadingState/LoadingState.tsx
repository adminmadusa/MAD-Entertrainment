import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { Spinner } from '../../primitives/Spinner';
import { LoadingStateProps } from './LoadingState.types';
import {
  loadingStateContainerClasses,
  loadingStateLabelClasses,
  loadingSpinnerClasses,
} from './LoadingState.styles';

export const LoadingState = forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ className, label = 'Loading content...', ...props }, ref) => {
    return (
      <div
        ref={ref}
        aria-live="polite"
        aria-busy="true"
        className={cn(loadingStateContainerClasses, className)}
        {...props}
      >
        <Spinner size="lg" className={loadingSpinnerClasses} aria-label={label} />
        <p className={loadingStateLabelClasses}>{label}</p>
      </div>
    );
  }
);

LoadingState.displayName = 'LoadingState';
