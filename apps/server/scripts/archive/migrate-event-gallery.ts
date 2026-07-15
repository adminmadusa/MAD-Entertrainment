import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Adjust path based on where the script is run from (assuming run from apps/server)
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

// Import schemas directly to avoid side effects of full app initialization
import { EventGallery, MediaType, MediaVisibility } from '../src/models/event-gallery.schema';
import { EventGallerySettings } from '../src/models/event-gallery-settings.schema';

// We define a lightweight schema for Event to safely read the legacy fields without full validation logic
const legacyEventSchema = new mongoose.Schema({
  title: String,
  galleryImages: [{ url: String, publicId: String }],
  memories: {
    publicationState: String, // 'DRAFT', 'PUBLISHED', 'HIDDEN'
    heading: String,
    thankYouMessage: String,
    highlights: String,
    gallery: [{ url: String, publicId: String }]
  }
}, { collection: 'events', strict: false });

const EventModel = mongoose.model('Event_Migration', legacyEventSchema);

async function runMigration() {
  console.log('Starting EventGallery Migration...');
  
  if (!MONGODB_URI) {
    console.error('No MONGODB_URI found.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  const events = await EventModel.find({}).lean();
  let eventsScanned = events.length;
  let galleryImagesFound = 0;
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  let settingsCreated = 0;

  for (const event of events) {
    const eventId = event._id;

    // 1. Determine arrays to migrate
    const legacyGallery = Array.isArray(event.galleryImages) ? event.galleryImages : [];
    const memoriesGallery = Array.isArray(event.memories?.gallery) ? event.memories.gallery : [];
    
    // Merge them. Since the audit found 0 overlaps, this is safe.
    // If there were overlaps, we'd deduplicate by publicId.
    const allImages = [...legacyGallery, ...memoriesGallery];
    
    const uniqueImages = Array.from(new Map(allImages.map(img => [img.publicId, img])).values());
    galleryImagesFound += uniqueImages.length;

    // 2. Migrate Images
    for (let i = 0; i < uniqueImages.length; i++) {
      const img = uniqueImages[i];
      try {
        // Idempotency check
        const existing = await EventGallery.findOne({ eventId, publicId: img.publicId });
        if (existing) {
          skipped++;
          continue;
        }

        const isCover = (i === 0); // First image is cover

        await EventGallery.create({
          eventId,
          mediaType: MediaType.IMAGE,
          url: img.url,
          publicId: img.publicId,
          sortOrder: i,
          isCover,
          visibility: MediaVisibility.PUBLIC,
          assetProvider: 'cloudinary'
          // uploadedBy is left null for legacy data
        });

        migrated++;
      } catch (err) {
        console.error(`Error migrating image ${img.publicId} for event ${eventId}:`, err);
        errors++;
      }
    }

    // 3. Migrate Settings (if applicable)
    // Only create settings if they had memories or if they had images
    if (uniqueImages.length > 0 || event.memories) {
      try {
        const existingSettings = await EventGallerySettings.findOne({ eventId });
        if (!existingSettings) {
          const published = event.memories?.publicationState === 'PUBLISHED';
          await EventGallerySettings.create({
            eventId,
            heading: event.memories?.heading || '',
            thankYouMessage: event.memories?.thankYouMessage || '',
            highlights: Array.isArray(event.memories?.highlights) ? event.memories.highlights : (event.memories?.highlights ? [event.memories.highlights] : []),
            published,
            publishedAt: published ? new Date() : undefined
          });
          settingsCreated++;
        }
      } catch (err) {
        console.error(`Error creating settings for event ${eventId}:`, err);
        errors++;
      }
    }
  }

  console.log('\n--- Migration Report ---');
  console.log(`Events scanned: ${eventsScanned}`);
  console.log(`Gallery images found: ${galleryImagesFound}`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Settings created: ${settingsCreated}`);
  console.log('------------------------');

  await mongoose.disconnect();
}

runMigration().catch(console.error);
