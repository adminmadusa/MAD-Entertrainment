import { NotificationType } from '@mad/shared';

import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Notification } from '../src/models/notification.schema';
import { createNotificationSafe } from '../src/services/notification.service';
import { logger } from '../src/utils/logger';

import 'dotenv/config';

async function verifyUniqueConstraint() {
  logger.info('🚀 Starting Unique Constraint & Legacy Null Allowance Verification...');

  try {
    await connectDatabase();

    const testJobId = `test-verify-unique-${Date.now()}`;

    // 1. Verify Unique Constraint via createNotificationSafe
    logger.info(`Inserting first notification with jobId: ${testJobId}...`);
    const doc1 = await createNotificationSafe({
      jobId: testJobId,
      type: NotificationType.OTP,
      channel: 'email',
      recipient: 'test1@example.com',
      isSent: false,
    });
    logger.info(`Successfully created doc1. ID: ${doc1._id}`);

    logger.info(`Attempting to insert second notification with SAME jobId: ${testJobId}...`);
    const doc2 = await createNotificationSafe({
      jobId: testJobId,
      type: NotificationType.OTP,
      channel: 'email',
      recipient: 'test2@example.com',
      isSent: false,
    });

    // createNotificationSafe should return the existing doc1 and NOT throw an error
    if (doc2._id.toString() === doc1._id.toString()) {
      logger.info('✅ Success: Caught duplicate key error, logged duplicate prevention, and successfully returned the existing document.');
    } else {
      throw new Error(`FAIL: Managed to create two distinct documents with the same jobId: ${doc1._id} and ${doc2._id}`);
    }

    // 2. Verify Multi-Null Allowance
    logger.info('Testing legacy null / missing jobId allowance...');
    const nullDoc1 = await createNotificationSafe({
      type: NotificationType.OTP,
      channel: 'email',
      recipient: 'null1@example.com',
      isSent: false,
    });
    logger.info(`Created first notification with missing jobId. ID: ${nullDoc1._id}`);

    const nullDoc2 = await createNotificationSafe({
      type: NotificationType.OTP,
      channel: 'email',
      recipient: 'null2@example.com',
      isSent: false,
    });
    logger.info(`Created second notification with missing jobId. ID: ${nullDoc2._id}`);

    logger.info('✅ Success: Multiple notifications with missing/null jobId are allowed.');

    // Cleanup test records
    logger.info('Cleaning up test records...');
    await Notification.deleteMany({
      _id: { $in: [doc1._id, nullDoc1._id, nullDoc2._id] },
    });
    logger.info('✅ Cleanup complete.');

  } catch (error) {
    logger.error({ err: error }, '❌ Verification failed.');
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

verifyUniqueConstraint();
