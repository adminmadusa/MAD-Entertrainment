import { ReactNode } from 'react';

export type DrawerSide = 'bottom' | 'left' | 'right';

export interface DrawerProps {
  /**
   * Controlled visibility of the drawer.
   */
  isOpen: boolean;
  /**
   * Action fired when clicking backdrop, close button, or pressing escape.
   */
  onClose: () => void;
  /**
   * The entry direction of the drawer.
   * @default 'right'
   */
  side?: DrawerSide;
  /**
   * Optional bold header title text.
   */
  title?: string;
  /**
   * Drawer body content.
   */
  children?: ReactNode;
}
