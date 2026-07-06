import type { Config } from 'tailwindcss';

/**
 * Shared Tailwind preset containing the canonical color design tokens
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
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-card': 'var(--color-bg-card)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        primary: 'var(--color-accent-purple)',
        accent: 'var(--color-accent-pink)',
        cyan: 'var(--color-accent-cyan)',
      },
    },
  },
};

export default preset;
