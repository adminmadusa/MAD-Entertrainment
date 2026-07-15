import { ReactNode } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalPresentation = 'centered' | 'bottom-sheet';

export interface ModalProps {
  /**
   * Defines the visual presentation mode of the modal.
   * @default 'centered'
   */
  presentation?: ModalPresentation;
  /**
   * Controlled visibility of the modal.
   */
  isOpen: boolean;
  /**
   * Action fired when clicking backdrop, close button, or pressing escape.
   */
  onClose: () => void;
  /**
   * Visual width scale of the modal.
   * @default 'md'
   */
  size?: ModalSize;
  /**
   * Toggles the top-right close icon.
   * @default false
   */
  showCloseButton?: boolean;
  /**
   * Modal content.
   */
  children?: ReactNode;
  /**
   * Toggles closing when clicking the backdrop layer.
   * @default false
   */
  closeOnBackdropClick?: boolean;
  /**
   * Toggles mobile swipe-down-to-close behavior.
   * @default false
   */
  enableSwipeToClose?: boolean;
  /**
   * Accessible id referencing the main title element.
   */
  ariaLabelledBy?: string;
  /**
   * Accessible id referencing the description element.
   */
  ariaDescribedBy?: string;
  /**
   * Custom classes for the modal content container.
   */
  className?: string;
}
