import { EventCategory, EVENT_CATEGORY_LABELS, TicketTier } from '@mad/shared';

import { Category } from '../models/category.schema';
import { Tier } from '../models/tier.schema';
import { logger } from './logger';

export const seedCategoriesAndTiers = async () => {
  try {
    logger.info('Seeding default categories (idempotent check)...');
    const defaultCategories = Object.entries(EVENT_CATEGORY_LABELS).map(([slug, name]) => ({
      name,
      slug,
      isDeleted: false,
    }));
    for (const cat of defaultCategories) {
      await Category.updateOne(
        { slug: cat.slug },
        { $setOnInsert: cat },
        { upsert: true }
      );
    }
    logger.info('Categories seeder completed');

    logger.info('Seeding default ticket tiers (idempotent check)...');
    const defaultTiers = [
      { name: 'General', slug: 'general', icon: 'ticket', color: '#6366F1', description: 'Standard admission entry.', sortIndex: 0, defaultVisibility: true },
      { name: 'VIP', slug: 'vip', icon: 'star', color: '#F59E0B', description: 'Premium VIP access.', sortIndex: 1, defaultVisibility: true },
      { name: 'Gold', slug: 'gold', icon: 'medal', color: '#EAB308', description: 'Tier-2 premium access.', sortIndex: 2, defaultVisibility: true },
      { name: 'Platinum', slug: 'platinum', icon: 'crown', color: '#A855F7', description: 'Ultimate access level.', sortIndex: 3, defaultVisibility: true },
      { name: 'Backstage', slug: 'backstage', icon: 'lock', color: '#EF4444', description: 'Operations and crew pass.', sortIndex: 4, defaultVisibility: false },
      { name: 'Family', slug: 'family', icon: 'users', color: '#10B981', description: 'Family group package pass.', sortIndex: 5, defaultVisibility: true },
      { name: 'Couple', slug: 'couple', icon: 'heart', color: '#EC4899', description: 'Pass admitting two guests.', sortIndex: 6, defaultVisibility: true },
      { name: 'Early Bird', slug: 'early_bird', icon: 'clock', color: '#14B8A6', description: 'Discounted early registration.', sortIndex: 7, defaultVisibility: true },
      { name: 'Free', slug: 'free', icon: 'gift', color: '#3B82F6', description: 'Complimentary registration.', sortIndex: 8, defaultVisibility: true },
    ];

    for (const tier of defaultTiers) {
      await Tier.updateOne(
        { slug: tier.slug },
        { $setOnInsert: { ...tier, isDeleted: false } },
        { upsert: true }
      );
    }
    logger.info('Ticket tiers seeder completed');
  } catch (error) {
    logger.error({ err: error }, 'Error seeding categories and tiers');
  }
};
