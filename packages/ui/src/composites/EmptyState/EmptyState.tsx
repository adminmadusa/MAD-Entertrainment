import React, { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import {
  emptyStateContainerVariants,
  emptyStateIconClasses,
  emptyStateTitleClasses,
  emptyStateDescriptionClasses,
  emptyStateActionClasses,
} from './EmptyState.styles';
import type { EmptyStateProps } from './EmptyState.types';

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, title, description, icon, action, variant = 'card', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(emptyStateContainerVariants({ variant }), className)}
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
