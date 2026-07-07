import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Category } from '../models/category.schema';
import { Tier } from '../models/tier.schema';
import { seedCategoriesAndTiers } from './seed-categories-tiers';

describe('Seed Categories and Tiers Idempotency Tests', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mad-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear categories and tiers collections before each test run
    await Category.deleteMany({});
    await Tier.deleteMany({});
  });

  it('should seed default categories and tiers successfully on first run', async () => {
    await seedCategoriesAndTiers();

    const categories = await Category.find({});
    const tiers = await Tier.find({});

    expect(categories.length).toBeGreaterThan(0);
    expect(tiers.length).toBe(9); // We expect exactly 9 standard library presets
  });

  it('should be idempotent and not create duplicate entries on consecutive runs', async () => {
    // Run 1
    await seedCategoriesAndTiers();
    const count1 = await Tier.countDocuments({});
    const catCount1 = await Category.countDocuments({});

    // Run 2
    await seedCategoriesAndTiers();
    const count2 = await Tier.countDocuments({});
    const catCount2 = await Category.countDocuments({});

    expect(count2).toBe(count1);
    expect(catCount2).toBe(catCount1);
  });

  it('should preserve existing custom values of standard slugs and only seed missing ones', async () => {
    // Manually pre-insert one tier with custom color and description
    await Tier.create({
      name: 'Custom VIP',
      slug: 'vip',
      color: '#00FF00',
      description: 'Pre-existing custom VIP tier',
    });

    await seedCategoriesAndTiers();

    // Verify seeder did not duplicate or overwrite the custom 'vip' record
    const vipRecord = await Tier.findOne({ slug: 'vip' });
    expect(vipRecord).not.toBeNull();
    expect(vipRecord?.color).toBe('#00FF00');
    expect(vipRecord?.description).toBe('Pre-existing custom VIP tier');

    // Verify other tiers were seeded normally
    const generalRecord = await Tier.findOne({ slug: 'general' });
    expect(generalRecord).not.toBeNull();
    expect(generalRecord?.color).toBe('#6366F1');
  });
});
