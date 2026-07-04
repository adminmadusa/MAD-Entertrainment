import { isReachable, refExists } from '../utils/git';

export function checkReachableFromDevelop(refName: string): boolean {
  return refExists('develop') && isReachable(refName, 'develop');
}

export function checkReachableFromLive(refName: string): boolean {
  return refExists('live') && isReachable(refName, 'live');
}

export function checkReachableFromRemediation(refName: string): boolean {
  return refExists('test/remediation-integration') && isReachable(refName, 'test/remediation-integration');
}
