export declare const STORAGE_KEYS: {
    readonly STORAGE_VERSION: "mad_storage_version";
    readonly USER_TOKEN: "mad_user_token";
    readonly USER_DATA: "mad_user_data";
    readonly ADMIN_TOKEN: "mad_admin_token";
    readonly ADMIN_DATA: "mad_admin_data";
};
export declare const STORAGE_VERSION = "v2";
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
//# sourceMappingURL=storage-keys.d.ts.map