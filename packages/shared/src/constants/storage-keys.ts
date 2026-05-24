export const STORAGE_KEYS = {
  STORAGE_VERSION: 'mad_storage_version',
  // User / web app
  USER_TOKEN: 'mad_user_token',
  USER_DATA: 'mad_user_data',
  // Admin app
  ADMIN_TOKEN: 'mad_admin_token',
  ADMIN_DATA: 'mad_admin_data',
} as const;

export const STORAGE_VERSION = 'v2';

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
