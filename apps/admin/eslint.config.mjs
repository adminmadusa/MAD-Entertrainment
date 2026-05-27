// @ts-check
import nextConfig from 'eslint-config-next/core-web-vitals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // ── Next.js recommended rules ─────────────────────────────────────────────
  ...nextConfig,

  // ── MAD Entertrainment Admin — Hydration Safety & Quality Rules ───────────
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      // ─── Hydration & Global Access Safety ──────────────────────────────────
      // Note: We turn off no-restricted-globals globally because standard ESLint
      // cannot distinguish between render-time access (unsafe) and event handler/useEffect
      // access (safe). Instead, developers must rely on the useMounted() hook or
      // useWindowWidth() to guard browser-only values.
      'no-restricted-globals': 'off',

      // Disable overly-pedantic React compiler / Next rules that flag safe patterns:
      'react-hooks/set-state-in-effect': 'off', // Synchronous state setting in useEffect on mount is common & safe
      'react-hooks/refs': 'off',               // Accessing ref in Provider value / stable refs is safe
      'react-hooks/purity': 'off',             // False positives on Math.random inside mutation callbacks
      'react/no-unescaped-entities': 'off',    // Extremely verbose and unhelpful for standard text containing quotes
      '@next/next/no-html-link-for-pages': 'off', // <a> tag is required in Error Boundaries to perform a hard reload

      // ─── Import/Export & Object Safety ────────────────────────────────────
      'react/jsx-no-undef': 'error',
      'react/no-danger': 'warn',
      'no-dupe-keys': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-nested-ternary': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
      'no-restricted-syntax': [
        'warn',
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'Avoid Math.random for IDs or security-sensitive values.',
        },
      ],
    },
  },
];
