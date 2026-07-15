import { createHash } from 'crypto';
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { FileSystemService } from '../FileSystemService';

export class BaselineService {
  constructor(
    private fs: FileSystemService,
    private repoRoot: string,
    private docsRoot: string
  ) {}

  private getFiles(dir: string): string[] {
    const results: string[] = [];
    if (!existsSync(dir)) {
      return results;
    }
    const list = readdirSync(dir);
    for (const file of list) {
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results.push(...this.getFiles(fullPath));
      } else if (/\.(md|json|yaml|yml)$/.test(file)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  private computeHash(filePath: string): string {
    const content = readFileSync(filePath, 'utf8');
    return createHash('sha256').update(content).digest('hex');
  }

  async load(): Promise<Record<string, string>> {
    const checksumsFilePath = join(this.repoRoot, '.governance/baseline/checksums.json');
    const exists = await this.fs.exists(checksumsFilePath);
    if (!exists) {
      return {};
    }
    try {
      const content = await this.fs.read(checksumsFilePath);
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  async compare(): Promise<{ path: string; status: 'ok' | 'modified' | 'added' }[]> {
    const baseline = await this.load();
    const targetDir = join(this.repoRoot, this.docsRoot);
    const files = this.getFiles(targetDir);
    const results: { path: string; status: 'ok' | 'modified' | 'added' }[] = [];

    for (const f of files) {
      const relativePath = f.replace(this.repoRoot + '/', '');
      const hash = this.computeHash(f);
      const baselineHash = baseline[relativePath];

      if (!baselineHash) {
        results.push({ path: relativePath, status: 'added' });
      } else if (baselineHash !== hash) {
        results.push({ path: relativePath, status: 'modified' });
      } else {
        results.push({ path: relativePath, status: 'ok' });
      }
    }

    return results;
  }

  async sync(dryRun: boolean): Promise<string[]> {
    const targetDir = join(this.repoRoot, this.docsRoot);
    const files = this.getFiles(targetDir);
    const checksums: Record<string, string> = {};
    const syncedFiles: string[] = [];

    for (const f of files) {
      const relativePath = f.replace(this.repoRoot + '/', '');
      const hash = this.computeHash(f);
      checksums[relativePath] = hash;
      syncedFiles.push(relativePath);
    }

    if (!dryRun) {
      const checksumsFilePath = join(this.repoRoot, '.governance/baseline/checksums.json');
      const metadataFilePath = join(this.repoRoot, '.governance/baseline/metadata.json');

      await this.fs.write(checksumsFilePath, JSON.stringify(checksums, null, 2) + '\n');

      const metadata = {
        updatedAt: new Date().toISOString(),
        filesCount: syncedFiles.length,
        version: '1.0.0',
      };
      await this.fs.write(metadataFilePath, JSON.stringify(metadata, null, 2) + '\n');
    }

    return syncedFiles;
  }
}
