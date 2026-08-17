export interface NumericStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
  label?: string;
}
