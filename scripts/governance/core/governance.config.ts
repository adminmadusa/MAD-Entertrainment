// scripts/governance/core/governance.config.ts

export const governanceConfig = {
  sharedComponentScopes: [
    'apps/admin',
    'apps/web',
  ],
  sharedComponentEnforcement: {
    ignoreFiles: [
      '**/AdminShell.tsx',
      '**/AdminSidebar.tsx',
      '**/MobileNavigation.tsx',
    ],
  },
};
