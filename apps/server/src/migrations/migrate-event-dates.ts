import 'dotenv/config';

import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../config/database';
import { Event } from '../models/event.schema';
import { logger } from '../utils/logger';

export async function migrateEventDates(): Promise<{ matchedCount: number; modifiedCount: number }> {
  logger.info('🚀 Starting Event Dates Simplification Migration...');

  try {
    const events = await Event.find({
      $or: [
        { bookingStartDate: { $exists: false } },
        { bookingEndDate: { $exists: false } }
      ]
    }).lean();

    logger.info(`Found ${events.length} event(s) requiring date migration.`);

    let modifiedCount = 0;

    for (const event of events) {
      const startDate = event.startDate;
      const endDate = event.endDate;
      const ticketSalesCloseMode = (event as any).ticketSalesCloseMode;
      const ticketSalesCloseDate = (event as any).ticketSalesCloseDate;
      const createdAt = (event as any).createdAt || new Date();

      // 1. Determine bookingStartDate
      const bookingStartDate = createdAt < startDate ? createdAt : new Date(new Date(startDate).getTime() - 30 * 24 * 60 * 60 * 1000);

      // 2. Determine bookingEndDate
      let bookingEndDate = startDate;
      if (ticketSalesCloseMode === 'EVENT_END' && endDate) {
        bookingEndDate = endDate;
      } else if (ticketSalesCloseMode === 'CUSTOM_DATE' && ticketSalesCloseDate) {
        bookingEndDate = ticketSalesCloseDate;
      }

      await Event.updateOne(
        { _id: event._id },
        {
          $set: {
            bookingStartDate,
            bookingEndDate,
          },
          $unset: {
            ticketSalesCloseMode: '',
            ticketSalesCloseDate: '',
          }
        }
      );

      modifiedCount++;
    }

    logger.info(`✅ Event Dates Migration completed. Migrated: ${modifiedCount} event(s).`);
    return {
      matchedCount: events.length,
      modifiedCount,
    };
  } catch (error) {
    logger.error({ err: error }, '❌ Event dates migration failed.');
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
      await migrateEventDates();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  })();
}
