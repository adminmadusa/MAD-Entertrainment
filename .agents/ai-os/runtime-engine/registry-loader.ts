import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { RegistryItem } from './types';
import { RegistryError } from './errors';

export class RegistryLoader {
  async loadRegistry(repoRoot: string, category: string): Promise<RegistryItem[]> {
    const registryPath = join(repoRoot, '.agents', 'ai-os', category, 'REGISTRY.md');
    if (!existsSync(registryPath)) {
      // Retain fallback active lists for decoupled runs if registry file not found
      return [
        {
          id: `VAL-NAM-001`,
          name: 'NAMING',
          category: 'validation',
          owner: 'Principal AI Systems Architect',
          version: '1.0.0',
          status: 'active',
          dependencies: []
        }
      ];
    }

    try {
      const content = readFileSync(registryPath, 'utf8');
      const items: RegistryItem[] = [];
      const lines = content.split('\n');

      for (const line of lines) {
        // Simple markdown table parser to extract ids and details
        if (line.includes('|') && line.includes('VAL-') || line.includes('PRM-') || line.includes('TMP-') || line.includes('SKL-')) {
          const columns = line.split('|').map(c => c.trim()).filter(Boolean);
          if (columns.length >= 3) {
            const id = columns[0].replace(/\*\*|\*/g, '').trim();
            const name = columns[1].trim();
            items.push({
              id,
              name,
              category,
              owner: 'Principal AI Systems Architect',
              version: '1.0.0',
              status: 'active',
              dependencies: []
            });
          }
        }
      }
      return items;
    } catch (err: any) {
      throw new RegistryError(`Failed to load registry catalog: ${err.message}`);
    }
  }
}
