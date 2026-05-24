import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ─── Color Palette ────────────────────────────────────
      colors: {
        background: {
          DEFAULT: '#0B0F1A',
          secondary: '#111827',
          card: '#161D2F',
          glass: 'rgba(22, 29, 47, 0.6)',
        },
        accent: {
          purple: '#7C3AED',
          'purple-light': '#9D5CF6',
          'purple-dark': '#5B21B6',
          pink: '#EC4899',
          'pink-light': '#F472B6',
          'pink-dark': '#BE185D',
          cyan: '#06B6D4',
          'cyan-light': '#22D3EE',
          'cyan-dark': '#0891B2',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#9CA3AF',
          muted: '#6B7280',
          accent: '#C4B5FD',
        },
        border: {
          DEFAULT: 'rgba(124, 58, 237, 0.2)',
          glow: 'rgba(124, 58, 237, 0.5)',
          subtle: 'rgba(255, 255, 255, 0.08)',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },

      // ─── Typography ───────────────────────────────────────
      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        'display-xl': ['clamp(3rem, 8vw, 6rem)', { lineHeight: '1.05', letterSpacing: '-0.04em' }],
        'display-lg': ['clamp(2.5rem, 6vw, 4.5rem)', { lineHeight: '1.08', letterSpacing: '-0.03em' }],
        'display-md': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-sm': ['clamp(1.5rem, 3vw, 2rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
      },

      // ─── Spacing ──────────────────────────────────────────
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '128': '32rem',
        '144': '36rem',
      },

      // ─── Border Radius ────────────────────────────────────
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },

      // ─── Box Shadows ──────────────────────────────────────
      boxShadow: {
        glow: '0 0 40px rgba(124, 58, 237, 0.3)',
        'glow-pink': '0 0 40px rgba(236, 72, 153, 0.3)',
        'glow-cyan': '0 0 40px rgba(6, 182, 212, 0.3)',
        'glow-sm': '0 0 15px rgba(124, 58, 237, 0.2)',
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 48px rgba(0, 0, 0, 0.6), 0 0 30px rgba(124, 58, 237, 0.15)',
        glass: '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },

      // ─── Background Images ────────────────────────────────
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
        'gradient-brand-reverse': 'linear-gradient(135deg, #EC4899 0%, #7C3AED 100%)',
        'gradient-cyan': 'linear-gradient(135deg, #06B6D4 0%, #7C3AED 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0B0F1A 0%, #111827 100%)',
        'gradient-card': 'linear-gradient(145deg, rgba(22, 29, 47, 0.9) 0%, rgba(11, 15, 26, 0.9) 100%)',
        'gradient-hero': 'radial-gradient(ellipse at top, rgba(124, 58, 237, 0.15) 0%, transparent 70%), radial-gradient(ellipse at bottom right, rgba(236, 72, 153, 0.1) 0%, transparent 60%)',
        'gradient-glow': 'radial-gradient(circle at center, rgba(124, 58, 237, 0.2) 0%, transparent 70%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },

      // ─── Animations ───────────────────────────────────────
      animation: {
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'spin-slow': 'spin 8s linear infinite',
        'marquee': 'marquee 25s linear infinite',
        'marquee-reverse': 'marquee-reverse 25s linear infinite',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)' },
          '50%': { boxShadow: '0 0 60px rgba(124, 58, 237, 0.6)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'marquee': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
      },

      // ─── Backdrop Blur ────────────────────────────────────
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },

      // ─── Screens ──────────────────────────────────────────
      screens: {
        xs: '375px',
        '3xl': '1920px',
      },

      // ─── Z-Index ──────────────────────────────────────────
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [],
};

export default config;
