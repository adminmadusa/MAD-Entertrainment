// Helper to generate a consistent React‑Query key for venue listings
// Used across the admin UI to ensure cache invalidation works correctly.
export const venueQueryKey = (filters: {
  page?: number;
  search?: string;
  city?: string;
}) => ["admin-venues", filters];
