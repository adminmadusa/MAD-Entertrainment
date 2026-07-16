import { ReactNode } from 'react';

export type DrawerSide = 'bottom' | 'left' | 'right' | 'top';

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
  /**
   * Custom classes for the drawer content container.
   */
  className?: string;
  /**
   * Toggles the drawer header section.
   * @default true
   */
  showHeader?: boolean;
  /**
   * Optional HTML ID.
   */
  id?: string;
}
