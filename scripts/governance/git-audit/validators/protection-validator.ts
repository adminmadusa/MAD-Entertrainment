export function isProtectedBranch(branchName: string): boolean {
  const clean = branchName.replace('origin/', '');
  return clean === 'develop' || clean === 'live';
}
