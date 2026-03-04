/**
 * Force RLS so table owner is also subject to policies (no bypass).
 * Run after 20260225000000-phase2-rls-tenant-isolation.
 */

'use strict';

const TENANT_SCOPED_TABLES = [
  'appointments', 'orders', 'services', 'staff', 'products',
  'tenant_settings', 'public_page_data', 'tenant_usage', 'tenant_subscriptions',
  'usage_alerts', 'customer_insights', 'transactions', 'hot_deals'
];

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    if (sequelize.getDialect() !== 'postgres') return;
    for (const table of TENANT_SCOPED_TABLES) {
      await sequelize.query(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`).catch((err) => {
        if (err.message && err.message.includes('does not exist')) return;
        throw err;
      });
    }
    await sequelize.query(`ALTER TABLE "auth_users" FORCE ROW LEVEL SECURITY;`).catch((err) => {
      if (err.message && err.message.includes('does not exist')) return;
      throw err;
    });
  },

  async down() {
    // FORCE has no reverse in Postgres; re-run RLS migration to re-enable without FORCE if needed.
  }
};
