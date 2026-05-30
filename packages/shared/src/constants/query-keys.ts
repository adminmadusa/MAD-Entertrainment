type QueryKeyPart = string | number | boolean | null | undefined | Record<string, unknown>;

const compact = (parts: QueryKeyPart[]) => parts.filter((part) => part !== undefined);

export const QUERY_KEYS = {
  public: {
    events: {
      all: ['public-events'] as const,
      list: (filters: Record<string, unknown> = {}) => ['public-events', filters] as const,
      featured: () => ['featured-events'] as const,
      detail: (slug?: string) => compact(['public-event', slug]) as readonly QueryKeyPart[],
      seats: (eventId?: string) => compact(['public-event-seats', eventId]) as readonly QueryKeyPart[],
    },
    bookings: {
      all: ['public-bookings'] as const,
      detail: (bookingRef?: string) => compact(['public-booking-details', bookingRef]) as readonly QueryKeyPart[],
      checkout: (bookingId?: string) => compact(['booking-checkout-details', bookingId]) as readonly QueryKeyPart[],
      mine: () => ['my-bookings'] as const,
    },
    auth: {
      me: () => ['public-auth-me'] as const,
    },
    popups: {
      active: () => ['active-popups'] as const,
    },
    djs: {
      list: () => ['public-dj-operators'] as const,
    },
  },
  admin: {
    analytics: {
      summary: () => ['admin-analytics-summary'] as const,
      revenue: (days: number) => ['admin-revenue-chart', days] as const,
    },
    bookings: {
      all: ['admin-bookings'] as const,
      list: (filters: Record<string, unknown> = {}) => ['admin-bookings', filters] as const,
      detail: (id?: string) => compact(['admin-booking', id]) as readonly QueryKeyPart[],
    },
    events: {
      all: ['admin-events'] as const,
      list: (filters: Record<string, unknown> = {}) => ['admin-events', filters] as const,
      listForSelect: () => ['admin-events-list'] as const,
      detail: (id?: string) => compact(['admin-event', id]) as readonly QueryKeyPart[],
    },
    refunds: {
      all: ['admin-refunds'] as const,
      list: (filters: Record<string, unknown> = {}) => ['admin-refunds', filters] as const,
    },
    notifications: {
      all: ['admin-notifications'] as const,
      list: (filters: Record<string, unknown> = {}) => ['admin-notifications', filters] as const,
    },
    diagnostics: {
      consistency: () => ['admin-diagnostics-consistency'] as const,
      reservations: (status?: string) => compact(['admin-diagnostics-reservations', status]) as readonly QueryKeyPart[],
      webhooks: (filters: Record<string, unknown> = {}) => ['admin-diagnostics-webhooks', filters] as const,
      emails: (filters: Record<string, unknown> = {}) => ['admin-diagnostics-emails', filters] as const,
    },
    coupons: {
      all: ['admin-coupons'] as const,
      list: (page?: number, active?: string) => compact(['admin-coupons', page, active]) as readonly QueryKeyPart[],
      detail: (id?: string) => compact(['admin-coupon', id]) as readonly QueryKeyPart[],
    },
    popups: {
      all: ['admin-popups'] as const,
      list: (page?: number) => compact(['admin-popups', page]) as readonly QueryKeyPart[],
      detail: (id?: string) => compact(['admin-popup', id]) as readonly QueryKeyPart[],
    },
    djs: {
      all: ['admin-djs'] as const,
      list: (filters: Record<string, unknown> = {}) => ['admin-djs', filters] as const,
      detail: (id?: string) => compact(['admin-dj', id]) as readonly QueryKeyPart[],
    },
    team: {
      all: ['admin-team'] as const,
      list: (page?: number) => compact(['admin-team', page]) as readonly QueryKeyPart[],
      me: () => ['admin-profile-me'] as const,
    },
  },
} as const;
