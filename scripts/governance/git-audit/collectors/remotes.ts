import { runCommand } from '../utils/exec';

export function collectRemoteBranches(): string[] {
  const output = runCommand('git branch -r --format="%(refname:short)"');
  return output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(name => name !== 'origin' && name !== 'origin/HEAD' && !name.includes('->'));
}
