/**
 * Add index (tenantId, startTime) for appointments.
 * Used by: list/filter by tenant + date range (dashboard, calendar, reports).
 * Phase 1 already has (tenantId, staffId, startTime) and (tenantId, platformUserId, startTime);
 * this index supports queries that filter only by tenantId + startTime.
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    if (sequelize.getDialect() !== 'postgres') return;

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_tenant_start_time
      ON appointments ("tenantId", "startTime");
    `);
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    if (sequelize.getDialect() !== 'postgres') return;

    await sequelize.query(`DROP INDEX IF EXISTS idx_appointments_tenant_start_time;`);
  }
};
