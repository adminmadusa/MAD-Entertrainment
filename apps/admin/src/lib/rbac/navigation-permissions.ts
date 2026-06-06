import { AdminRole } from '@mad/shared';

// Mapping of route prefix to permitted roles
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard': [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER],
  '/users': [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT],
  '/bookings': [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT],
  '/ticket-profiles': [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT],
  '/events': [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT],
  '/refunds': [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT],
  '/scanner': [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT, AdminRole.SCANNER],
  '/coupons': [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT],
  '/dj-operators': [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER],
  '/popups': [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT],
  '/notifications': [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT],
  '/team': [AdminRole.SUPER_ADMIN],
  '/diagnostics': [AdminRole.SUPER_ADMIN],
  '/settings': [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER]
};

// Mapping of role to landing page home to prevent redirect loops
export const DEFAULT_ROUTE_BY_ROLE: Record<string, string> = {
  [AdminRole.SUPER_ADMIN]: '/dashboard',
  [AdminRole.ADMIN]: '/dashboard',
  [AdminRole.MANAGER]: '/dashboard',
  [AdminRole.SUPPORT]: '/bookings',
  [AdminRole.SCANNER]: '/scanner'
};

/**
 * Validates if the given role is authorized to access a route path.
 */
export function canAccessRoute(path: string, role: string): boolean {
  // Find the matching prefix configuration, sorting by length descending to match most specific first
  const matchedPrefix = Object.keys(ROUTE_PERMISSIONS)
    .sort((a, b) => b.length - a.length)
    .find(prefix => 
      path === prefix || path.startsWith(prefix + '/')
    );
  if (!matchedPrefix) return true; // Non-configured or public routes bypass check

  // Specific subpath checks for creation and editing (e.g. /new, /:id/edit)
  const isSubpath = path !== matchedPrefix;
  if (isSubpath) {
    const restrictedSubpathModules = ['/events', '/ticket-profiles', '/coupons', '/popups'];
    if (restrictedSubpathModules.includes(matchedPrefix)) {
      // Creation and modification operations are restricted to super_admin, admin, manager
      return [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER].includes(role as AdminRole);
    }
  }

  return ROUTE_PERMISSIONS[matchedPrefix].includes(role);
}
