import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export interface FileSystemService {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
}

export class NodeFileSystemService implements FileSystemService {
  async read(path: string): Promise<string> {
    return readFileSync(path, 'utf8');
  }

  async write(path: string, content: string): Promise<void> {
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(path, content, 'utf8');
  }

  async exists(path: string): Promise<boolean> {
    return existsSync(path);
  }

  async mkdir(path: string): Promise<void> {
    mkdirSync(path, { recursive: true });
  }
}
