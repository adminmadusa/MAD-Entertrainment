import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { PopupCampaign } from '../models/popup-campaign.schema';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function fixPopups() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const result = await PopupCampaign.updateMany(
      {}, // Target all popups
      {
        $set: {
          ctaUrl: '/events',
          ctaText: 'Book Now',
        },
      }
    );

    console.log(`Updated ${result.modifiedCount} popups to include CTA fields.`);
  } catch (error) {
    console.error('Error fixing popups:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

fixPopups();
