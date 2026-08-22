import type { Config } from 'tailwindcss';

/**
 * Shared Tailwind preset containing the canonical color and motion design tokens
 * mapped to the global CSS custom properties.
 *
 * Ownership: @mad/ui (packages/ui)
 * Consumers: apps/web, apps/admin
 */
const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg)',
        'background-secondary': 'var(--color-bg-secondary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-card': 'var(--color-bg-card)',
        'bg-card-hover': 'var(--color-bg-card-hover)',
        'surface-secondary': 'var(--color-bg-secondary)',
        'surface-card': 'var(--color-bg-card)',
        'surface-elevated': 'var(--color-bg-card-hover)',
        border: 'var(--glass-border, rgba(255, 255, 255, 0.1))',
        'border-subtle': 'rgba(255, 255, 255, 0.08)',
        'border-default': 'rgba(255, 255, 255, 0.12)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        primary: 'var(--color-accent-purple)',
        accent: 'var(--color-accent-pink)',
        cyan: 'var(--color-accent-cyan)',
        danger: 'rgb(239 68 68)',
        error: 'rgb(239 68 68)',
      },
      zIndex: {
        'sticky-cell': '10',
        'sticky-header': '20',
        dropdown: '30',
        popover: '40',
        dialog: '50',
      },
      transitionDuration: {
        fast: 'var(--transition-fast)',   // 150ms
        base: 'var(--transition-base)',   // 250ms
        slow: 'var(--transition-slow)',   // 400ms
      },
      transitionTimingFunction: {
        smooth: 'var(--transition-smooth)',   // cubic-bezier(0.4, 0, 0.2, 1)
        bounce: 'var(--transition-bounce)',   // cubic-bezier(0.34, 1.56, 0.64, 1)
      },
    },
  },
};

export default preset;
