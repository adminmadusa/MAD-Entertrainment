import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Admin Scanner Security & Permissions Policy', () => {
  it('ensures next.config.ts explicitly grants camera=(self) permission', () => {
    const nextConfigPath = path.resolve(__dirname, '../../../next.config.ts');
    const content = fs.readFileSync(nextConfigPath, 'utf8');

    // Regression check: camera=() explicitly blocks all camera access in browsers
    expect(content).not.toContain("camera=()");
    expect(content).toContain("camera=(self)");
  });
});
