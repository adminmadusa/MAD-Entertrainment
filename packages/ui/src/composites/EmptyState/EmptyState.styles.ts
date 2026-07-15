import { cva } from 'class-variance-authority';

export const emptyStateContainerVariants = cva(
  'flex flex-col items-center justify-center text-center',
  {
    variants: {
      variant: {
        card: 'p-8 border border-dashed border-border rounded-2xl bg-surface-secondary/20 max-w-md mx-auto',
        inline: 'p-4',
        table: 'p-8 w-full max-w-full',
      },
    },
    defaultVariants: {
      variant: 'card',
    },
  }
);

export const emptyStateIconClasses = 'text-text-muted mb-4 h-10 w-10 shrink-0';
export const emptyStateTitleClasses = 'text-base font-semibold text-text-primary mb-1';
export const emptyStateDescriptionClasses = 'text-xs text-text-muted mb-6 max-w-md mx-auto';
export const emptyStateActionClasses = 'flex justify-center';
