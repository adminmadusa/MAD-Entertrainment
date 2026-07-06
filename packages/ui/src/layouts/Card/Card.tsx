import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { CardProps } from './Card.types';
import { cardBaseClasses, cardPaddings, cardVariants } from './Card.styles';

export const Card = forwardRef<HTMLElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref as any}
        className={cn(
          cardBaseClasses,
          cardPaddings[padding],
          cardVariants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
