import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { AdminModel } from '../src/models/admin.schema';
import { logger } from '../src/utils/logger';

async function runMigration() {
  logger.info('🚀 Starting Admin Role Casing Normalization Migration...');

  try {
    await connectDatabase();

    const rolesMap = {
      SUPER_ADMIN: 'super_admin',
      ADMIN: 'admin',
      MANAGER: 'manager',
      SUPPORT: 'support',
      SCANNER: 'scanner',
    };

    for (const [upper, lower] of Object.entries(rolesMap)) {
      const query = { role: upper };
      const update = { $set: { role: lower } };

      const result = await AdminModel.collection.updateMany(query, update);

      logger.info(
        `Normalized role: ${upper} ➔ ${lower}. Modified: ${result.modifiedCount} documents.`
      );
    }

    logger.info('✅ Admin Role Casing Normalization Migration completed successfully.');
  } catch (error) {
    logger.error({ err: error }, '❌ Migration failed.');
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

runMigration();
