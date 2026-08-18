import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  rules: {
    exports: 'warn',
    types: 'warn',
    enumMembers: 'warn',
    duplicates: 'warn',
  },
  workspaces: {
    '.': {
      entry: ['scripts/**/*.ts', 'scripts/**/*.js', 'knip.ts'],
      project: ['scripts/**/*.ts'],
      ignore: ['.agents/**'],
      ignoreDependencies: ['@sentry/nextjs', '@sentry/node'],
      ignoreBinaries: ['tsx'],
    },
    'apps/web': {
      entry: [
        'src/app/**/*.{ts,tsx}',
        'src/utils/image-loader.ts',
      ],
      project: ['src/**/*.{ts,tsx}'],
      ignoreDependencies: [
        '@testing-library/user-event',
        'lucide-react',
        'server-only',
        'zod',
      ],
    },
    'apps/admin': {
      entry: [
        'src/app/**/*.{ts,tsx}',
      ],
      project: ['src/**/*.{ts,tsx}'],
      ignoreDependencies: [
        '@mad/validations',
        '@testing-library/react',
      ],
    },
    'apps/server': {
      entry: [
        'src/server.ts',
        'src/instrument.ts',
        'src/scripts/**/*.ts',
        'src/migrations/**/*.ts',
      ],
      project: ['src/**/*.ts'],
      ignoreDependencies: ['autocannon', '@react-email/components'],
    },
    'packages/shared': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/types': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/ui': {
      entry: [
        'src/index.tsx',
        'src/icons/index.ts',
        'src/tailwind/preset.ts',
        'src/internal/testing/index.ts',
      ],
      project: ['src/**/*.{ts,tsx}'],
      ignoreDependencies: [
        '@testing-library/react',
        '@testing-library/user-event',
        'tailwindcss',
      ],
    },
    'packages/utils': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/validations': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/governance-cli': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
      ignoreDependencies: ['yaml'],
    },
  },
};

export default config;
