'use client';

import React, { useState, forwardRef } from 'react';

import { cn } from '../../lib/cn';
import {
  tooltipTriggerClasses,
  tooltipBubbleClasses,
  tooltipActiveClasses,
  tooltipSides,
} from './Tooltip.styles';
import type { TooltipProps } from './Tooltip.types';

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, side = 'top', children }, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    const showTooltip = () => setIsVisible(true);
    const hideTooltip = () => setIsVisible(false);

    return (
      <div
        ref={ref}
        className={tooltipTriggerClasses}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
        {isVisible && (
          <div
            role="tooltip"
            className={cn(
              tooltipBubbleClasses,
              tooltipSides[side],
              tooltipActiveClasses
            )}
          >
            {content}
          </div>
        )}
      </div>
    );
  }
);

Tooltip.displayName = 'Tooltip';
