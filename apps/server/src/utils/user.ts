export function requiresOnboarding(user: { firstName?: string; lastName?: string }): boolean {
  return !user.firstName?.trim() || !user.lastName?.trim();
}
