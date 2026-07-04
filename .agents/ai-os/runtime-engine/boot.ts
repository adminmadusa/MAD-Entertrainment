import { TIER_ORDER } from './constants';
import { BootError } from './errors';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

export class Bootstrapper {
  async boot(repoRoot: string): Promise<string[]> {
    const loadedTiers: string[] = [];
    const aiOsRoot = join(repoRoot, '.agents', 'ai-os');

    if (!existsSync(aiOsRoot)) {
      throw new BootError(`AI Operating System root directory not found at: ${aiOsRoot}`);
    }

    try {
      const children = readdirSync(aiOsRoot);

      for (const tier of TIER_ORDER) {
        // Normalizes planned folder references (e.g. standardizing naming maps)
        const matched = children.find(child => child.toLowerCase() === tier.toLowerCase());
        if (matched) {
          loadedTiers.push(tier);
        }
      }
      return loadedTiers;
    } catch (err: any) {
      throw new BootError(`Startup bootstrapper failed: ${err.message}`);
    }
  }
}
