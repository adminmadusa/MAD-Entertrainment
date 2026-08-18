import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  {
    test: {
      name: 'server',
      environment: 'node',
      globals: true,
      include: [
        'apps/server/src/**/*.test.ts',
        'apps/server/src/**/*.test.tsx',
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
    extends: 'apps/web/vitest.config.ts',
    test: {
      name: 'web',
      environment: 'jsdom',
      globals: true,
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
  },
  {
    extends: 'apps/web/vitest.config.ts',
    resolve: {
      alias: {
        '@': resolve(__dirname, './apps/admin/src'),
        '@mad/shared': resolve(__dirname, './packages/shared/src'),
        '@mad/types': resolve(__dirname, './packages/types/src'),
        '@mad/ui': resolve(__dirname, './packages/ui/src'),
        '@mad/utils': resolve(__dirname, './packages/utils/src'),
        '@mad/validations': resolve(__dirname, './packages/validations/src'),
      }
    },
    test: {
      name: 'admin',
      environment: 'jsdom',
      globals: true,
      include: [
        'apps/admin/src/**/*.test.{ts,tsx}'
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
  },
  {
    test: {
      name: 'governance',
      environment: 'node',
      globals: true,
      include: [
        'scripts/governance/**/*.test.ts'
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**'
      ]
    }
  },
  {
    test: {
      name: 'ai-os',
      environment: 'node',
      globals: true,
      include: [
        '.agents/ai-os/runtime-engine/**/*.test.ts'
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
    extends: 'apps/web/vitest.config.ts',
    test: {
      name: 'ui',
      environment: 'jsdom',
      globals: true,
      include: [
        'packages/ui/src/**/*.test.{ts,tsx}'
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**'
      ],
      setupFiles: [
        'apps/web/vitest.setup.ts'
      ]
    }
  }
];
