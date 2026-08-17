import type { Config } from 'tailwindcss';

import sharedPreset from '@mad/ui/tailwind/preset';

const config: Config = {
  presets: [sharedPreset as Config],
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
        'display-xl': ['clamp(2.25rem, 6vw, 5rem)', { lineHeight: '1.08' }],
        'display-lg': ['clamp(1.85rem, 5vw, 4rem)', { lineHeight: '1.1' }],
        'display-md': ['clamp(1.5rem, 4vw, 3rem)', { lineHeight: '1.15' }],
        'display-sm': ['clamp(1.25rem, 3vw, 2.25rem)', { lineHeight: '1.2' }],
      },
      colors: {
        'accent-purple': 'var(--color-accent-purple)',
        // governance-ignore VAL-UI-007: Tailwind config defines design tokens and requires raw hex values; this IS the token definition layer
        'accent-purple-light': '#a78bfa',
        'accent-pink': 'var(--color-accent-pink)',
        // governance-ignore VAL-UI-007: Tailwind config defines design tokens and requires raw hex values; this IS the token definition layer
        'accent-pink-light': '#f472b6',
        'accent-cyan': 'var(--color-accent-cyan)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
