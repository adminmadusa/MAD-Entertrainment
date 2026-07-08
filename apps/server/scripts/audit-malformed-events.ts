import mongoose from 'mongoose';

import { getEnv } from '../src/config/env';
import { Event } from '../src/models/event.schema';

import 'dotenv/config';

async function runAudit() {
  const env = getEnv();
  const uri = env.MONGODB_URI;

  console.log('Connecting to database for Event Data Integrity Audit...');
  await mongoose.connect(uri);

  try {
    const allEvents = await Event.find({}).lean();
    console.log(`\nFound ${allEvents.length} total event documents in the database.`);

    const malformedEvents = [];

    for (const ev of allEvents) {
      const missingFields: string[] = [];
      if (!ev.slug) missingFields.push('slug');
      if (!ev.category) missingFields.push('category');
      if (!ev.status) missingFields.push('status');
      if (!ev.bookingMode) missingFields.push('bookingMode');
      if (!ev.bannerImage) missingFields.push('bannerImage');
      if (ev.totalCapacity === undefined || ev.totalCapacity === null) missingFields.push('totalCapacity');

      if (missingFields.length > 0) {
        malformedEvents.push({
          id: ev._id.toString(),
          title: ev.title || 'Untitled Event',
          missingFields,
          createdAt: ev.createdAt,
          updatedAt: ev.updatedAt,
          isDeleted: ev.isDeleted,
        });
      }
    }

    console.log(`\nDetected ${malformedEvents.length} malformed event document(s).\n`);

    if (malformedEvents.length > 0) {
      console.log('=== Malformed Document Details ===');
      malformedEvents.forEach((item, index) => {
        console.log(`\n[${index + 1}] Event ID: ${item.id}`);
        console.log(`    Title: "${item.title}"`);
        console.log(`    Missing Fields: ${item.missingFields.join(', ')}`);
        console.log(`    Created At: ${item.createdAt}`);
        console.log(`    Updated At: ${item.updatedAt}`);
        console.log(`    isDeleted: ${item.isDeleted}`);
      });
    } else {
      console.log('✅ No malformed event documents found in the database.');
    }
  } catch (error) {
    console.error('Audit failed with error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed.');
  }
}

runAudit();
