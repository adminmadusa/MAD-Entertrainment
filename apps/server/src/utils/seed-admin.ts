import bcrypt from 'bcryptjs';
import { AdminRole } from '@mad/shared';
import { AdminModel } from '../models/admin.schema';
import { logger } from '../utils/logger';

export const seedAdmin = async () => {
  try {
    const email = process.env.ADMIN_SEED_EMAIL;
    const password = process.env.ADMIN_SEED_PASSWORD;

    if (!email || !password) {
      logger.warn('ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD not provided in .env');
      return;
    }

    const existingAdmin = await AdminModel.findOne({ email });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(password, 10);
      await AdminModel.create({
        email,
        passwordHash,
        name: 'Super Admin',
        role: AdminRole.SUPER_ADMIN,
      });
      logger.info(`Seeded initial admin user with email: ${email}`);
    } else {
      logger.info(`Admin user with email ${email} already exists.`);
    }
  } catch (error) {
    logger.error({ err: error }, 'Error seeding admin user');
  }
};
