// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'reports/**',
      'node_modules/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // ─── Legacy Baseline Exclusions (Configured to off to pass initial gate) ───
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      'prefer-const': 'off',
      'no-empty': 'off',
      'no-useless-catch': 'off',
      'prefer-rest-params': 'off',
      'no-async-promise-executor': 'off',

      // ─── Quality & Governance Rules ───
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/ban-ts-comment': 'warn',
      'no-restricted-syntax': [
        'warn',
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'Avoid Math.random for IDs or security-sensitive values.',
        },
      ],
    },
  }
);
