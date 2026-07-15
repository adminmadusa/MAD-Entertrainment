import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../config/database';
import { Ticket } from '../models/ticket.schema';
import { logger } from '../utils/logger';

import 'dotenv/config';

export async function backfillTicketAssignment(): Promise<{ matchedCount: number; modifiedCount: number }> {
  logger.info('🚀 Starting Ticket Assignment Status Backfill Migration...');

  try {
    const result = await Ticket.updateMany(
      {
        assignmentStatus: {
          $exists: false,
        },
      },
      {
        $set: {
          assignmentStatus: 'unassigned',
        },
      }
    );

    logger.info(
      `✅ Ticket Assignment Backfill migration completed. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount} documents.`
    );
    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  } catch (error) {
    logger.error({ err: error }, '❌ Migration failed.');
    throw error;
  }
}

// Execute migration if script is run directly from CLI
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      if (!isDatabaseConnected()) {
        await connectDatabase();
      }
      await backfillTicketAssignment();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  })();
}
