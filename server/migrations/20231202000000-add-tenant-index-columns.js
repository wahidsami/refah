/**
 * Adds columns required by Tenant model indexes (status, city, plan).
 * The ensure-base-tables migration created minimal "tenants"; sync() then fails
 * when creating index on "status" because the column was missing.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    if (sequelize.getDialect() !== 'postgres') return;

    // Create enum types if not exist (PostgreSQL)
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_tenants_status" AS ENUM('pending', 'approved', 'rejected', 'suspended', 'inactive');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_tenants_plan" AS ENUM('free_trial', 'basic', 'pro', 'enterprise');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Add indexed columns if not exist (safe for existing full schema)
    await sequelize.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status "enum_tenants_status" DEFAULT 'pending';
    `);
    await sequelize.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city VARCHAR(255);
    `);
    await sequelize.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan "enum_tenants_plan" DEFAULT 'free_trial';
    `);
  },

  async down(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    if (sequelize.getDialect() !== 'postgres') return;
    // Optional: drop columns; skip to avoid breaking existing data
  }
};
