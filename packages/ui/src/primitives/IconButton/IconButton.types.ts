import { ButtonProps } from '../Button/Button.types';

export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'fullWidth'> {
  /**
   * The icon component to render.
   */
  children: React.ReactNode;
  /**
   * Enforced accessibility label for screen readers.
   */
  'aria-label': string;
}
