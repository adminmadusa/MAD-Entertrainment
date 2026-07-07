import { execSync } from 'child_process';

const repoPath = '/Users/admin/Desktop/MAD Entertrainment';

export function runCommand(cmd: string): string {
  try {
    return execSync(cmd, { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (err) {
    return '';
  }
}

export function runWithExitCode(cmd: string): number {
  try {
    execSync(cmd, { cwd: repoPath, stdio: 'ignore' });
    return 0;
  } catch (err) {
    return 1;
  }
}
