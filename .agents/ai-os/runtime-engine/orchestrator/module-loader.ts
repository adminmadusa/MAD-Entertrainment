import { existsSync } from 'fs';

export class ModuleLoader {
  async loadModule<T>(filePath: string): Promise<T | null> {
    if (!existsSync(filePath)) {
      return null;
    }
    try {
      // Dynamic import
      const module = await import(filePath);
      return module.default || module;
    } catch {
      return null;
    }
  }
}
