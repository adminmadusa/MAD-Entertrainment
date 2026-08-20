import type { InputHTMLAttributes } from 'react';

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  clearable?: boolean;
  loading?: boolean;
  className?: string;
  containerClassName?: string;
}
