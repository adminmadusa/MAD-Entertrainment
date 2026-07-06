import { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The visual style variant of the button.
   * @default 'primary'
   */
  variant?: ButtonVariant;
  /**
   * The size variant of the button.
   * @default 'md'
   */
  size?: ButtonSize;
  /**
   * Shows a loading spinner and disables the button.
   * @default false
   */
  isLoading?: boolean;
  /**
   * Stretches the button to 100% width of its container.
   * @default false
   */
  fullWidth?: boolean;
  /**
   * Custom icon element rendered on the left of the text.
   */
  leftIcon?: ReactNode;
  /**
   * Custom icon element rendered on the right of the text.
   */
  rightIcon?: ReactNode;
}
