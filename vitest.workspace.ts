import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'unit',
      environment: 'node',
      include: [
        'apps/*/src/**/*.test.ts',
        'packages/*/src/**/*.test.ts'
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        '**/.next/**'
      ]
    }
  }
]);
