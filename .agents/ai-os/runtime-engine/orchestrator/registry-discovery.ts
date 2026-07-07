import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface DiscoveredRegistry {
  category: string;
  filePath: string;
  isValid: boolean;
}

export class RegistryDiscovery {
  discoverRegistries(repoRoot: string): DiscoveredRegistry[] {
    const categories = [
      'validation',
      'skills',
      'prompts',
      'templates',
      'knowledge',
      'runtime'
    ];

    const discovered: DiscoveredRegistry[] = [];

    for (const cat of categories) {
      const filePath = join(repoRoot, '.agents', 'ai-os', cat, 'REGISTRY.md');
      const isValid = existsSync(filePath);
      discovered.push({
        category: cat,
        filePath,
        isValid
      });
    }

    return discovered;
  }
}
