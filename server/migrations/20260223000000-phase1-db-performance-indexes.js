/**
 * Phase 1 DB performance: add indexes for list/query patterns.
 * - (tenantId, createdAt) for appointments and orders
 * - (tenantId, staffId, startTime) and (tenantId, platformUserId, startTime) for appointments
 * - slug lookup for public tenant pages
 * Run: npx sequelize-cli db:migrate
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    const dialect = sequelize.getDialect();

    if (dialect !== 'postgres') {
      console.log('Skipping Phase 1 index migration: not PostgreSQL');
      return;
    }

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_tenant_created_at
      ON appointments ("tenantId", "createdAt");
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_tenant_staff_start
      ON appointments ("tenantId", "staffId", "startTime");
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_tenant_user_start
      ON appointments ("tenantId", "platformUserId", "startTime");
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_tenant_created_at
      ON orders ("tenantId", "createdAt");
    `);
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug_lookup
      ON tenants (slug);
    `);
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    if (sequelize.getDialect() !== 'postgres') return;

    await sequelize.query(`DROP INDEX IF EXISTS idx_appointments_tenant_created_at;`);
    await sequelize.query(`DROP INDEX IF EXISTS idx_appointments_tenant_staff_start;`);
    await sequelize.query(`DROP INDEX IF EXISTS idx_appointments_tenant_user_start;`);
    await sequelize.query(`DROP INDEX IF EXISTS idx_orders_tenant_created_at;`);
    await sequelize.query(`DROP INDEX IF EXISTS idx_tenants_slug_lookup;`);
  }
};
