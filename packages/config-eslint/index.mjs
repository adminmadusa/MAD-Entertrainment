import nextConfig from 'eslint-config-next/core-web-vitals';
import unusedImports from 'eslint-plugin-unused-imports';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-globals': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      'react/no-unescaped-entities': 'off',
      '@next/next/no-html-link-for-pages': 'off',
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
  ...(process.env.UNUSED_IMPORTS_REPORT === '1'
    ? [
        {
          files: ['**/*.{ts,tsx,js,jsx}'],
          plugins: {
            'unused-imports': unusedImports,
          },
          rules: {
            '@typescript-eslint/no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'warn',
            'unused-imports/no-unused-vars': [
              'warn',
              {
                vars: 'all',
                varsIgnorePattern: '^_',
                args: 'after-used',
                argsIgnorePattern: '^_',
              },
            ],
          },
        },
      ]
    : []),
];

export default config;
