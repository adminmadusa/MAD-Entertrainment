import { EventCategory, EVENT_CATEGORY_LABELS, TicketTier } from '@mad/shared';

import { Category } from '../models/category.schema';
import { Tier } from '../models/tier.schema';
import { logger } from './logger';

export const seedCategoriesAndTiers = async () => {
  try {
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      logger.info('Seeding default categories...');
      const defaultCategories = Object.entries(EVENT_CATEGORY_LABELS).map(([slug, name]) => ({
        name,
        slug,
        isDeleted: false,
      }));
      await Category.insertMany(defaultCategories);
      logger.info(`Seeded ${defaultCategories.length} categories`);
    }

    const tierCount = await Tier.countDocuments();
    if (tierCount === 0) {
      logger.info('Seeding default ticket tiers...');
      const defaultTiers = Object.values(TicketTier).map((tierVal) => {
        let name = tierVal.replace(/_/g, ' ');
        name = name.charAt(0).toUpperCase() + name.slice(1);
        return {
          name,
          slug: tierVal,
          isDeleted: false,
        };
      });
      await Tier.insertMany(defaultTiers);
      logger.info(`Seeded ${defaultTiers.length} ticket tiers`);
    }
  } catch (error) {
    logger.error({ err: error }, 'Error seeding categories and tiers');
  }
};
