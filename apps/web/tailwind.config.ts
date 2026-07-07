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
        'display-xl': ['clamp(3.5rem, 9vw, 6rem)', { lineHeight: '1.05' }],
        'display-lg': ['clamp(2.8rem, 7vw, 5rem)', { lineHeight: '1.02' }],
        'display-md': ['clamp(2.2rem, 5vw, 3.5rem)', { lineHeight: '1.05' }],
        'display-sm': ['clamp(1.8rem, 4vw, 2.5rem)', { lineHeight: '1.1' }],
      },
      colors: {
        'accent-purple': 'var(--color-accent-purple)',
        // governance-ignore VAL-UI-007: Tailwind config defines design tokens and requires raw hex values; this IS the token definition layer
        'accent-purple-light': '#a78bfa',
        'accent-pink': 'var(--color-accent-pink)',
        'accent-cyan': 'var(--color-accent-cyan)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
