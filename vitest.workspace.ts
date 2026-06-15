import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'server',
      environment: 'node',
      include: [
        'apps/server/src/**/*.test.ts',
        'packages/*/src/**/*.test.ts'
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        '**/.next/**'
      ]
    }
  },
  {
    test: {
      name: 'web',
      environment: 'jsdom',
      include: [
        'apps/web/src/**/*.test.{ts,tsx}'
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        '**/.next/**'
      ],
      setupFiles: [
        'apps/web/vitest.setup.ts'
      ]
    }
  }
]);
