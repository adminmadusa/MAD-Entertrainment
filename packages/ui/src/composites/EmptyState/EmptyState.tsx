import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { EmptyStateProps } from './EmptyState.types';
import {
  emptyStateContainerClasses,
  emptyStateIconClasses,
  emptyStateTitleClasses,
  emptyStateDescriptionClasses,
  emptyStateActionClasses,
} from './EmptyState.styles';

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, title, description, icon, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(emptyStateContainerClasses, className)}
        {...props}
      >
        {icon && <div className={emptyStateIconClasses}>{icon}</div>}
        <h4 className={emptyStateTitleClasses}>{title}</h4>
        {description && <p className={emptyStateDescriptionClasses}>{description}</p>}
        {action && <div className={emptyStateActionClasses}>{action}</div>}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';
