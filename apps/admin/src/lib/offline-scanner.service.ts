// ─── Offline Scanner Service ──────────────────────────────────
//
// IndexedDB-backed store for ticket scans captured while the venue
// scanner is offline. Records persist until they are successfully
// synced to the backend or explicitly dismissed by the operator.
//
// Schema version 2 adds sync metadata fields (syncStatus, failureReason,
// retryCount, lastAttemptAt, scannedAt). A destructive migration is
// performed on upgrade because the v1 store had no index and records
// lacked typed status fields.
// ─────────────────────────────────────────────────────────────

const DB_NAME = 'mad-offline-scanner';
const STORE_NAME = 'scans';
const DB_VERSION = 2;

// ─── Types ────────────────────────────────────────────────────

type SyncStatus = 'pending' | 'synced' | 'failed';

interface OfflineScan {
  id?: number;
  ticketId: string;
  eventId: string;
  /** Unix ms timestamp of when the scan was captured offline. */
  timestamp: number;
  /** ISO 8601 string of when the scan was captured — used for audit display. */
  scannedAt: string;
  syncStatus: SyncStatus;
  failureReason?: string;
  retryCount: number;
  lastAttemptAt?: number;
}

interface FailedScan {
  id: number;
  ticketId: string;
  reason: string;
}

interface SyncResult {
  synced: number;
  failed: FailedScan[];
}

type ScanFn = (ticketId: string, eventId: string) => Promise<unknown>;

// ─── IndexedDB Initialisation ─────────────────────────────────

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      // Destructive migration: drop v1 store (no typed fields, no index).
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }

      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      });
      // Index on syncStatus allows efficient filtering for pending/failed scans.
      store.createIndex('syncStatus', 'syncStatus', { unique: false });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Read Operations ──────────────────────────────────────────


/**
 * Returns only records with `syncStatus === 'pending'`.
 * These are the scans that still need to reach the backend.
 */
export async function getPendingScans(): Promise<OfflineScan[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('syncStatus');
    const request = index.getAll('pending');
    request.onsuccess = () => resolve(request.result as OfflineScan[]);
    request.onerror = () => reject(request.error);
  });
}


/**
 * Returns true if a pending scan for this ticketId + eventId already exists
 * in the queue. Prevents duplicate offline entries from the same operator session.
 *
 * Per Q1 decision: ticket format validation is deferred to the backend.
 * This guard only prevents double-queueing within the same offline session.
 */
export async function isDuplicateScan(
  ticketId: string,
  eventId: string
): Promise<boolean> {
  const pending = await getPendingScans();
  return pending.some(
    (s) => s.ticketId === ticketId && s.eventId === eventId
  );
}

// ─── Write Operations ─────────────────────────────────────────

/**
 * Saves a new offline scan with `syncStatus: 'pending'`.
 * Call `isDuplicateScan` before calling this function.
 */
export async function saveOfflineScan(
  ticketId: string,
  eventId: string
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: Omit<OfflineScan, 'id'> = {
      ticketId,
      eventId,
      timestamp: Date.now(),
      scannedAt: new Date().toISOString(),
      syncStatus: 'pending',
      retryCount: 0,
    };
    store.add(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Deletes records by ID. Filters out undefined/null IDs before deletion
 * to prevent silent IndexedDB failures from incomplete records (GAP-5 fix).
 */
async function clearOfflineScans(ids: number[]): Promise<void> {
  const validIds = ids.filter((id): id is number => id != null);
  if (validIds.length === 0) return;

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    validIds.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Updates a subset of fields on a scan record by its ID. */
async function updateScan(
  id: number,
  updates: Partial<OfflineScan>
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result as OfflineScan | undefined;
      if (!record) { resolve(); return; }
      store.put({ ...record, ...updates });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Sync Orchestration ───────────────────────────────────────

/**
 * Submits all pending offline scans to the backend using the provided
 * scan function. Returns a `SyncResult` describing what succeeded and
 * what failed.
 *
 * Per Q2 decision:
 * - Successful scans are removed from IndexedDB.
 * - Failed scans are retained with `syncStatus: 'failed'` and a
 *   `failureReason` for operator review.
 *
 * Per Q3 decision:
 * - Conflicts (e.g. "already checked in from another device") are
 *   surfaced in the returned `failed` array so the UI can display them.
 */
export async function syncScans(scanFn: ScanFn): Promise<SyncResult> {
  const pending = await getPendingScans();
  if (pending.length === 0) return { synced: 0, failed: [] };

  const syncedIds: number[] = [];
  const failed: FailedScan[] = [];

  for (const scan of pending) {
    const id = scan.id as number;
    try {
      await scanFn(scan.ticketId, scan.eventId);
      await updateScan(id, {
        syncStatus: 'synced',
        lastAttemptAt: Date.now(),
      });
      syncedIds.push(id);
    } catch (err: unknown) {
      const reason =
        err instanceof Error ? err.message : 'Unknown sync error';
      await updateScan(id, {
        syncStatus: 'failed',
        failureReason: reason,
        retryCount: (scan.retryCount ?? 0) + 1,
        lastAttemptAt: Date.now(),
      });
      failed.push({ id, ticketId: scan.ticketId, reason });
    }
  }

  // Only delete records that were successfully synced (GAP-1 fix).
  await clearOfflineScans(syncedIds);

  return { synced: syncedIds.length, failed };
}
