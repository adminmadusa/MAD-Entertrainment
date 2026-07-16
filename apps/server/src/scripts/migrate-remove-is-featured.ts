/* eslint-disable no-console */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mad-entertrainment';

async function runMigration() {
  console.log('Connecting to database:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const eventsCollection = db.collection('events');

  console.log('Starting migration to remove isFeatured...');

  // The $unset operator removes the field from documents
  const result = await eventsCollection.updateMany(
    { isFeatured: { $exists: true } },
    { $unset: { isFeatured: "" } }
  );

  console.log(`Matched ${result.matchedCount} documents.`);
  console.log(`Modified ${result.modifiedCount} documents (removed isFeatured).`);

  // Remove the isFeatured index if it exists
  try {
    const indexes = await eventsCollection.indexes();
    for (const index of indexes) {
      if (index.key && index.key.isFeatured !== undefined) {
        console.log(`Dropping index: ${index.name}`);
        await eventsCollection.dropIndex(index.name);
      }
    }
  } catch (err) {
    console.error('Error while dropping indexes:', err);
  }

  console.log('Migration completed successfully.');
  process.exit(0);
}

runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
