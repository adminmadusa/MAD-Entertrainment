import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // ─── Custom Font Sizes ────────────────────────
      fontSize: {
        'display-xl': ['clamp(3.5rem, 9vw, 6rem)', { lineHeight: '1.05' }],
        'display-lg': ['clamp(2.8rem, 7vw, 5rem)', { lineHeight: '1.02' }],
        'display-md': ['clamp(2.2rem, 5vw, 3.5rem)', { lineHeight: '1.05' }],
        'display-sm': ['clamp(1.8rem, 4vw, 2.5rem)', { lineHeight: '1.1' }],
      },
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
        'accent-purple': 'var(--color-accent-purple)',
        'accent-purple-light': '#a78bfa',
        'accent-pink': 'var(--color-accent-pink)',
        'accent-cyan': 'var(--color-accent-cyan)',
      },
    },
  },
  plugins: [],
};
export default config;
