import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tier } from './tier.schema';

describe('Tier Schema Unit Tests', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mad-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should initialize schema fields with correct defaults', () => {
    const tier = new Tier({
      name: 'Custom VIP',
      slug: 'custom-vip',
    });

    expect(tier.name).toBe('Custom VIP');
    expect(tier.slug).toBe('custom-vip');
    expect(tier.isDeleted).toBe(false);
    expect(tier.icon).toBe('ticket');
    expect(tier.color).toBe('#6366F1');
    expect(tier.description).toBe('');
    expect(tier.isActive).toBe(true);
    expect(tier.defaultVisibility).toBe(true);
    expect(tier.sortIndex).toBe(0);
  });

  it('should allow custom fields mapping when specified', () => {
    const tier = new Tier({
      name: 'Super VIP',
      slug: 'super-vip',
      icon: 'star',
      color: '#FF0000',
      description: 'Exclusive tier description',
      isActive: false,
      defaultVisibility: false,
      sortIndex: 99,
    });

    expect(tier.icon).toBe('star');
    expect(tier.color).toBe('#FF0000');
    expect(tier.description).toBe('Exclusive tier description');
    expect(tier.isActive).toBe(false);
    expect(tier.defaultVisibility).toBe(false);
    expect(tier.sortIndex).toBe(99);
  });
});
