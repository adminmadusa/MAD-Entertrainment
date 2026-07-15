type QueryKeyPart = string | number | boolean | null | undefined | Record<string, unknown>;
export declare const QUERY_KEYS: {
    readonly public: {
        readonly events: {
            readonly all: readonly ["public-events"];
            readonly list: (filters?: Record<string, unknown>) => readonly ["public-events", Record<string, unknown>];
            readonly featured: () => readonly ["featured-events"];
            readonly detail: (slug?: string) => readonly QueryKeyPart[];
            readonly seats: (eventId?: string) => readonly QueryKeyPart[];
        };
        readonly bookings: {
            readonly all: readonly ["public-bookings"];
            readonly detail: (bookingRef?: string) => readonly QueryKeyPart[];
            readonly checkout: (bookingId?: string) => readonly QueryKeyPart[];
            readonly mine: () => readonly ["my-bookings"];
        };
        readonly auth: {
            readonly me: () => readonly ["public-auth-me"];
        };
        readonly popups: {
            readonly active: () => readonly ["active-popups"];
        };
        readonly djs: {
            readonly list: () => readonly ["public-dj-operators"];
        };
    };
    readonly admin: {
        readonly analytics: {
            readonly summary: () => readonly ["admin-analytics-summary"];
            readonly revenue: (days: number) => readonly ["admin-revenue-chart", number];
        };
        readonly bookings: {
            readonly all: readonly ["admin-bookings"];
            readonly list: (filters?: Record<string, unknown>) => readonly ["admin-bookings", Record<string, unknown>];
            readonly detail: (id?: string) => readonly QueryKeyPart[];
        };
        readonly events: {
            readonly all: readonly ["admin-events"];
            readonly list: (filters?: Record<string, unknown>) => readonly ["admin-events", Record<string, unknown>];
            readonly listForSelect: () => readonly ["admin-events-list"];
            readonly detail: (id?: string) => readonly QueryKeyPart[];
        };
        readonly refunds: {
            readonly all: readonly ["admin-refunds"];
            readonly list: (filters?: Record<string, unknown>) => readonly ["admin-refunds", Record<string, unknown>];
        };
        readonly notifications: {
            readonly all: readonly ["admin-notifications"];
            readonly list: (filters?: Record<string, unknown>) => readonly ["admin-notifications", Record<string, unknown>];
        };
        readonly diagnostics: {
            readonly consistency: () => readonly ["admin-diagnostics-consistency"];
            readonly reservations: (status?: string) => readonly QueryKeyPart[];
            readonly webhooks: (filters?: Record<string, unknown>) => readonly ["admin-diagnostics-webhooks", Record<string, unknown>];
            readonly emails: (filters?: Record<string, unknown>) => readonly ["admin-diagnostics-emails", Record<string, unknown>];
        };
        readonly coupons: {
            readonly all: readonly ["admin-coupons"];
            readonly list: (page?: number, active?: string) => readonly QueryKeyPart[];
            readonly detail: (id?: string) => readonly QueryKeyPart[];
        };
        readonly popups: {
            readonly all: readonly ["admin-popups"];
            readonly list: (page?: number) => readonly QueryKeyPart[];
            readonly detail: (id?: string) => readonly QueryKeyPart[];
        };
        readonly djs: {
            readonly all: readonly ["admin-djs"];
            readonly list: (filters?: Record<string, unknown>) => readonly ["admin-djs", Record<string, unknown>];
            readonly detail: (id?: string) => readonly QueryKeyPart[];
        };
        readonly team: {
            readonly all: readonly ["admin-team"];
            readonly list: (page?: number) => readonly QueryKeyPart[];
            readonly me: () => readonly ["admin-profile-me"];
        };
    };
};
export {};
//# sourceMappingURL=query-keys.d.ts.map