import 'dotenv/config';
import mongoose from 'mongoose';
import { Event } from '../src/models/event.schema';
import { getEnv } from '../src/config/env';

async function runCleanup() {
  const env = getEnv();
  const uri = env.MONGODB_URI;

  console.log('Connecting to database for Event Cleanup...');
  await mongoose.connect(uri);

  try {
    const malformedIds = [
      '6a130824c1b49119fb6b41ab',
      '6a130da71ae12bdde20cf562',
      '6a26811d8e65cff803546472'
    ];

    console.log(`Deletions queued for IDs: ${malformedIds.join(', ')}`);
    const result = await Event.deleteMany({ _id: { $in: malformedIds } });
    console.log(`Successfully deleted ${result.deletedCount} malformed event document(s) from the database.`);
  } catch (error) {
    console.error('Cleanup failed with error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

runCleanup();
