import { getWorktreeMap } from '../utils/git';

export function collectWorktrees(): Map<string, string> {
  return getWorktreeMap();
}
