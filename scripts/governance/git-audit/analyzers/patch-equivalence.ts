import { checkPatchEquivalent } from '../utils/git';

export function analyzePatchEquivalence(branchName: string): boolean {
  return checkPatchEquivalent(branchName);
}
