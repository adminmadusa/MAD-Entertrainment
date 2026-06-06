import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Notification } from '../src/models/notification.schema';
import { logger } from '../src/utils/logger';

async function createIndexWithValidation() {
  logger.info('🚀 Starting Pre-Index Build Validation...');

  try {
    await connectDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection is not open');
    }

    // 1. Run Pre-Index Validation Query
    logger.info('Running duplicate string jobId check...');
    const duplicateCheck = await Notification.aggregate([
      {
        $match: {
          jobId: { $type: 'string' },
        },
      },
      {
        $group: {
          _id: '$jobId',
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);

    if (duplicateCheck.length > 0) {
      logger.error(`❌ Pre-Index Validation failed! Found ${duplicateCheck.length} duplicate groups.`);
      logger.error(JSON.stringify(duplicateCheck, null, 2));
      throw new Error('Index build aborted due to duplicate records.');
    }

    logger.info('✅ Pre-Index Validation passed. Zero duplicates found.');

    // 2. Trigger Partial Unique Index Build
    logger.info('Building partial unique index jobId_1_unique in the background...');
    await Notification.collection.createIndex(
      { jobId: 1 },
      {
        name: 'jobId_1_unique',
        unique: true,
        partialFilterExpression: { jobId: { $type: 'string' } },
        background: true,
      }
    );

    logger.info('✅ Index build request submitted successfully.');

    // Print active indexes to confirm
    const indexes = await Notification.collection.indexes();
    logger.info('Current active indexes:');
    logger.info(JSON.stringify(indexes, null, 2));
  } catch (error) {
    logger.error({ err: error }, '❌ Index build failed.');
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

createIndexWithValidation();
