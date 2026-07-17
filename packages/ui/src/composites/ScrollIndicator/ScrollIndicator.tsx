import { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import type { ScrollIndicatorProps } from './ScrollIndicator.types';

export const ScrollIndicator = forwardRef<HTMLDivElement, ScrollIndicatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none select-none',
          className
        )}
        {...props}
      >
        <span className="text-[9px] uppercase tracking-widest text-text-muted font-bold animate-pulse">
          Scroll
        </span>
        <div className="w-5 h-8 rounded-full border border-border flex justify-center p-1 bg-surface-secondary/50 backdrop-blur-[2px]">
          <div className="w-1 h-1.5 bg-primary rounded-full animate-scroll-dot" />
        </div>
      </div>
    );
  }
);

ScrollIndicator.displayName = 'ScrollIndicator';
