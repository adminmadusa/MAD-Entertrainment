import { isReachable } from '../utils/git';

export function checkReachableFromDevelop(refName: string): boolean {
  return isReachable(refName, 'develop');
}

export function checkReachableFromLive(refName: string): boolean {
  return isReachable(refName, 'live');
}

export function checkReachableFromRemediation(refName: string): boolean {
  return isReachable(refName, 'test/remediation-integration');
}
