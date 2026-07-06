import { ReactNode } from 'react';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /**
   * The text or node displayed inside the tooltip popover.
   */
  content: ReactNode;
  /**
   * The visual placement side of the tooltip relative to the target element.
   * @default 'top'
   */
  side?: TooltipSide;
  /**
   * The trigger element that receives hover and focus triggers.
   */
  children: ReactNode;
}
