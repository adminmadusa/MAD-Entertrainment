import fs from 'fs';
import path from 'path';
import { RegisteredBranch } from '../models/registry';

const REGISTRY_PATH = '/Users/admin/Desktop/MAD Entertrainment/.agents/branch_registry.json';

export function writeBranchRegistry(branches: RegisteredBranch[]): void {
  const dir = path.dirname(REGISTRY_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(branches, null, 2), 'utf8');
}
