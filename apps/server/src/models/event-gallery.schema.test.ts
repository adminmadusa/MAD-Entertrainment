import mongoose from 'mongoose';
import { EventGallery, MediaType, MediaVisibility } from './event-gallery.schema';

describe('EventGallery Schema', () => {
  it('should validate a correct event gallery item', async () => {
    const validData = {
      eventId: new mongoose.Types.ObjectId(),
      mediaType: MediaType.IMAGE,
      url: 'https://example.com/img.jpg',
      publicId: 'img1',
      sortOrder: 0,
      isCover: true,
      visibility: MediaVisibility.PUBLIC,
      assetProvider: 'cloudinary'
    };

    const doc = new EventGallery(validData);
    const error = doc.validateSync();
    expect(error).toBeUndefined();
  });

  it('should require eventId, url, and publicId', async () => {
    const invalidData = {
      sortOrder: 1,
      isCover: false
    };

    const doc = new EventGallery(invalidData);
    const error = doc.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors['eventId']).toBeDefined();
    expect(error?.errors['url']).toBeDefined();
    expect(error?.errors['publicId']).toBeDefined();
  });
});
