/**
 * Ensures base tables (tenants, staff) exist before scheduling migration.
 * The scheduling migration (20240101000000) adds FK to "staff"; if we run
 * migrations on an empty DB (e.g. Coolify before app sync), staff is missing.
 * This migration creates minimal tables with IF NOT EXISTS so it's safe
 * when tables were already created by app sync.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const dialect = sequelize.getDialect();
    if (dialect !== 'postgres') return;

    // Create tenants if not exists (minimal columns; app sync adds the rest)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        "dbSchema" VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create staff if not exists (minimal columns; app sync adds the rest)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  },

  async down(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const dialect = sequelize.getDialect();
    if (dialect !== 'postgres') return;

    // Only drop if we're sure we created them (risky to drop in production).
    // In practice, leave tables; this down() is a no-op for safety.
    // await sequelize.query('DROP TABLE IF EXISTS staff CASCADE;');
    // await sequelize.query('DROP TABLE IF EXISTS tenants CASCADE;');
  }
};
