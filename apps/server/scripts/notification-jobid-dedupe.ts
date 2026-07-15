import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Notification } from '../src/models/notification.schema';
import { logger } from '../src/utils/logger';

import 'dotenv/config';

// Fixed Archive Collection Name as approved
const ARCHIVE_COLLECTION = 'notifications_archive_pr1b';

async function runDeduplication() {
  const isExecute = process.argv.includes('--execute');
  logger.info(`🚀 Starting Notification jobId Deduplication Migration... [Mode: ${isExecute ? 'EXECUTE' : 'DRY-RUN'}]`);

  try {
    await connectDatabase();

    // 1. Find all duplicate string jobIds using aggregation
    const duplicates = await Notification.aggregate([
      {
        $match: {
          jobId: { $type: 'string' },
        },
      },
      {
        $group: {
          _id: '$jobId',
          count: { $sum: 1 },
          docs: { $push: '$$ROOT' },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);

    logger.info(`Found ${duplicates.length} duplicate jobId groups.`);

    if (duplicates.length === 0) {
      logger.info('✅ No duplicate string jobIds found. Nothing to clean up.');
      return;
    }

    const docsToArchive: any[] = [];
    const idsToDelete: mongoose.Types.ObjectId[] = [];

    for (const group of duplicates) {
      const jobId = group._id;
      const docs = group.docs;

      logger.info(`\nGroup jobId: "${jobId}" (Contains ${docs.length} duplicates):`);

      // Determine preservation:
      // Rule 1: Sent (or isSent: true) takes priority.
      // Rule 2: Oldest createdAt takes priority.
      let preservedDoc = docs[0];

      for (let i = 1; i < docs.length; i++) {
        const doc = docs[i];
        const pIsSent = preservedDoc.status === 'sent' || preservedDoc.isSent;
        const dIsSent = doc.status === 'sent' || doc.isSent;

        if (dIsSent && !pIsSent) {
          preservedDoc = doc;
        } else if (dIsSent === pIsSent) {
          // If both have the same sent status, keep the oldest one
          if (new Date(doc.createdAt) < new Date(preservedDoc.createdAt)) {
            preservedDoc = doc;
          }
        }
      }

      logger.info(`  ➔ Preserved Doc: ID ${preservedDoc._id} | Status: ${preservedDoc.status} | Created: ${preservedDoc.createdAt}`);

      // All other docs in this group are targeted for deletion/archiving
      for (const doc of docs) {
        if (doc._id.toString() !== preservedDoc._id.toString()) {
          docsToArchive.push(doc);
          idsToDelete.push(doc._id);
          logger.info(`  ✖ Targeted Duplicate: ID ${doc._id} | Status: ${doc.status} | Created: ${doc.createdAt}`);
        }
      }
    }

    logger.info(`\n--- Dry-Run Summary Report ---`);
    logger.info(`Total records to archive and delete: ${docsToArchive.length}`);

    if (!isExecute) {
      logger.info('Dry-run complete. Re-run this script with the --execute flag to perform the database modifications.');
      return;
    }

    // 2. Perform archiving to notifications_archive_pr1b
    logger.info('\nStarting Archive Phase...');
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection is not open');
    }
    const archiveColl = db.collection(ARCHIVE_COLLECTION);

    // Insert records into archive
    const archiveResult = await archiveColl.insertMany(docsToArchive);
    logger.info(`Successfully copied ${archiveResult.insertedCount} records to ${ARCHIVE_COLLECTION}.`);

    // 3. Integrity Verification Check
    logger.info('Running Integrity Verification checks...');
    const archivedCount = await archiveColl.countDocuments({
      _id: { $in: idsToDelete },
    });

    if (archivedCount !== docsToArchive.length) {
      throw new Error(`CRITICAL FAULT: Archive count verification failed! Expected: ${docsToArchive.length}, Actual archived: ${archivedCount}`);
    }

    // Individual data field verification
    for (const originalDoc of docsToArchive) {
      const archivedDoc = await archiveColl.findOne({ _id: originalDoc._id });
      if (!archivedDoc || archivedDoc.jobId !== originalDoc.jobId) {
        throw new Error(`CRITICAL FAULT: Data integrity check failed for document ID: ${originalDoc._id}`);
      }
    }
    logger.info('✅ Integrity and count checks passed successfully.');

    // 4. Safe Deletion Phase
    logger.info('Starting deletion from active notifications collection...');
    const deleteResult = await Notification.deleteMany({
      _id: { $in: idsToDelete },
    });

    logger.info(`Successfully deleted ${deleteResult.deletedCount} targeted duplicate records.`);
    logger.info('✅ Notification jobId Deduplication Migration completed successfully.');
  } catch (error) {
    logger.error({ err: error }, '❌ Migration failed.');
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

runDeduplication();
