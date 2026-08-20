export type ApiError = {
  message: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
  errors?: Record<string, string[]>;
  retryAfter?: number;
};

export type ImageAsset = {
  url?: string;
  publicId?: string;
  hash?: string;
  alt?: string;
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedDataResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginatedItemsResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface JwtPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  iss?: string;
  aud?: string;
  [key: string]: unknown;
}

export interface BulkOperationResult {
  successCount: number;
  failedCount: number;
  results: {
    id: string;
    status: 'success' | 'failed';
    reason?: string;
  }[];
}

export interface BulkActionConfig<TId = string> {
  id: string;
  _unusedType?: TId;
  label: string;
  icon?: unknown;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  requireConfirmation?: boolean;
  confirmationMessage?: string;
  loadingLabel?: string;
  successLabel?: string;
  permission?: string;
  danger?: boolean;
}

export interface BulkActionResult {
  actionId: string;
  successCount: number;
  failedCount: number;
  results: { id: string; status: 'success' | 'failed'; reason?: string }[];
}

export interface BulkProgress {
  actionId: string;
  total: number;
  completed: number;
  failed: number;
}

export type DiagnosticsReport = {
  timestamp: string;
  database: {
    state: string;
    readyState: number;
    connectionsCount: number;
  };
  redis: {
    connected: boolean;
  };
  queues: {
    name: string;
    active: number;
    waiting: number;
    delayed: number;
    failed: number;
    completed: number;
    oldestWaitingJobAgeMs: number;
  }[];
  dlq: {
    totalFailedCount: number;
  };
};

export type QueueJob = {
  id?: string;
  name: string;
  data: Record<string, unknown>;
  opts?: Record<string, unknown>;
};
