import { defineWorkspace as maybeDefineWorkspace } from 'vitest/config';

type WorkspaceProject = {
  test: {
    name: string;
    environment: string;
    include: string[];
    exclude: string[];
  };
};

const defineWorkspaceCompat =
  typeof maybeDefineWorkspace === 'function'
    ? maybeDefineWorkspace
    : (projects: WorkspaceProject[]) => projects;

export default defineWorkspaceCompat([
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
