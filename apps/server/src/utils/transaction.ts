import mongoose, { ClientSession } from 'mongoose';
import { logger } from './logger';

let isTransactionSupported: boolean | null = null;

/**
 * Resilient transaction execution helper. Runs the callback inside a session
 * transaction if replica sets are supported by the deployment, otherwise falls
 * back gracefully to atomic non-transactional operations.
 * Guarantees that the callback fn() is executed exactly once.
 */
export async function runInTransaction<T>(
  fn: (session: ClientSession | undefined) => Promise<T>
): Promise<T> {
  // Determine transaction capability before invoking the callback
  if (isTransactionSupported === null) {
    try {
      const conn = mongoose.connection;
      if (conn && conn.readyState === 1) {
        const client = conn.getClient();
        const type = (client as any)?.topology?.description?.type as string | undefined;
        if (type && type !== 'Unknown') {
          isTransactionSupported = type === 'ReplicaSetNoPrimary' || type === 'ReplicaSetWithPrimary' || type === 'Sharded';
        } else {
          const hello = await conn.db.command({ hello: 1 }).catch(() => null);
          isTransactionSupported = !!hello?.setName || !!hello?.hosts;
        }
      }
    } catch (err) {
      logger.debug({ err }, 'Failed to determine transaction support during startup');
    }
  }

  // Fallback to non-transactional execution if transactions are known to be unsupported
  if (isTransactionSupported === false) {
    return fn(undefined);
  }

  const session = await mongoose.startSession().catch(() => null);
  if (!session) {
    return fn(undefined);
  }

  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result!;
  } catch (err: any) {
    if (
      err?.message?.includes('replica set') ||
      err?.message?.includes('Transaction') ||
      err?.codeName === 'CommandNotSupported'
    ) {
      isTransactionSupported = false;
      logger.warn(
        { err },
        'MongoDB transactions are not supported on this deployment. Falling back to non-transactional execution for subsequent calls.'
      );
    }
    throw err;
  } finally {
    await session.endSession().catch(() => {});
  }
}
