import { defineConfig } from 'vitest/config';
import workspaceConfig from './vitest.workspace';

export default defineConfig({
  test: {
    globals: true,
    projects: workspaceConfig,
  }
});
