import { resolve, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { EngineContext } from './types';
import { RegistryError } from './errors';

export class ContextLoader {
  async loadContext(startPath: string = process.cwd()): Promise<EngineContext> {
    let currentDir = startPath;
    let repoRoot: string | null = null;

    // Traverses upwards to find the workspace root
    for (let i = 0; i < 10; i++) {
      if (existsSync(join(currentDir, 'pnpm-workspace.yaml')) || existsSync(join(currentDir, 'package.json'))) {
        repoRoot = currentDir;
        break;
      }
      const parent = resolve(currentDir, '..');
      if (parent === currentDir) break;
      currentDir = parent;
    }

    if (!repoRoot) {
      throw new RegistryError('Failed to autodetect repository root workspace.');
    }

    const workspaces: string[] = [];
    const packages: Record<string, string> = {};
    const applications: Record<string, string> = {};

    // Parses workspaces dynamically
    const workspaceYamlPath = join(repoRoot, 'pnpm-workspace.yaml');
    if (existsSync(workspaceYamlPath)) {
      const content = readFileSync(workspaceYamlPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('-') && line.includes('/*')) {
          const glob = line.replace(/-|'|"|\s/g, '');
          workspaces.push(glob);
        }
      }
    }

    // Resolves applications and packages
    const appsDir = join(repoRoot, 'apps');
    if (existsSync(appsDir)) {
      applications['web'] = join(appsDir, 'web');
      applications['admin'] = join(appsDir, 'admin');
      applications['server'] = join(appsDir, 'server');
    }

    const pkgsDir = join(repoRoot, 'packages');
    if (existsSync(pkgsDir)) {
      packages['shared'] = join(pkgsDir, 'shared');
      packages['types'] = join(pkgsDir, 'types');
      packages['ui'] = join(pkgsDir, 'ui');
      packages['utils'] = join(pkgsDir, 'utils');
      packages['validations'] = join(pkgsDir, 'validations');
    }

    return {
      repoRoot,
      workspaces,
      packages,
      applications,
      activeSkills: ['naming-audit', 'architecture-review', 'typescript-audit', 'react-audit', 'security-audit'],
      activeValidators: ['VAL-NAM-001', 'VAL-NAM-002', 'VAL-ARC-001', 'VAL-TS-001', 'VAL-REC-001'],
      activeTemplates: ['TMP-AUD-001', 'TMP-PLN-001', 'TMP-IMP-001', 'TMP-GOV-001', 'TMP-DOC-001']
    };
  }
}
