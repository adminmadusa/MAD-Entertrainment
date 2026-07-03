import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, relative, isAbsolute } from 'path';

export class FileWriter {
  public static write(workspaceRoot: string, relativePath: string, content: string) {
    const fullPath = resolve(workspaceRoot, relativePath);
    
    // Strict path validation to prevent directory traversal
    const rel = relative(workspaceRoot, fullPath);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error(`Security Violation: Attempted write outside workspace: ${relativePath}`);
    }

    const dir = dirname(fullPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(fullPath, content, 'utf8');
  }
}
