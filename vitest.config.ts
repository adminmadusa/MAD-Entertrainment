import { defineConfig } from 'vitest/config';

import workspaceConfig from './vitest.workspace';

export default defineConfig({
  test: {
    globals: true,
    projects: workspaceConfig,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html', 'clover'],
      exclude: [
        'dist/**',
        'coverage/**',
        'scripts/**',
        'reports/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        'vitest.config.ts',
        'vitest.workspace.ts',
        'apps/web/vitest.config.ts',
        'apps/web/vitest.setup.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 55,
        functions: 65,
        lines: 70,
      },
    },
  }
});
