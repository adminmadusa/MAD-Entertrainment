import fs from 'fs';
import path from 'path';
import { VerificationInfo } from '../models/registry';

const VERIFICATION_PATH = '/Users/admin/Desktop/MAD Entertrainment/.agents/verification_registry.json';

export function writeVerificationRegistry(verifications: VerificationInfo[]): void {
  const dir = path.dirname(VERIFICATION_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(VERIFICATION_PATH, JSON.stringify(verifications, null, 2), 'utf8');
}
