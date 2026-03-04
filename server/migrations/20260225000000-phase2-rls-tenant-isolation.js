/**
 * Phase 2 security/tenancy: enable RLS on tenant-scoped tables.
 * Policies: visible rows only when "tenantId" = current_setting('app.tenant_id')::uuid,
 * or when app.tenant_id is not set (gradual rollout / super-admin).
 *
 * Run: npx sequelize-cli db:migrate
 */

'use strict';

const TENANT_SCOPED_TABLES = [
  'appointments',
  'orders',
  'services',
  'staff',
  'products',
  'tenant_settings',
  'public_page_data',
  'tenant_usage',
  'tenant_subscriptions',
  'usage_alerts',
  'customer_insights',
  'transactions',
  'hot_deals'
];

/** Policy: allow when app.tenant_id unset, or row matches. Safe when setting is empty (no cast). */
const POLICY_EXPR = `(
  (current_setting('app.tenant_id', true) IS NULL OR trim(coalesce(current_setting('app.tenant_id', true), '')) = '')
  OR ("tenantId" = (nullif(trim(current_setting('app.tenant_id', true)), '')::uuid))
)`;

const POLICY_EXPR_SNAKE = `(
  (current_setting('app.tenant_id', true) IS NULL OR trim(coalesce(current_setting('app.tenant_id', true), '')) = '')
  OR (tenant_id = (nullif(trim(current_setting('app.tenant_id', true)), '')::uuid))
)`;

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    const dialect = sequelize.getDialect();
    if (dialect !== 'postgres') {
      console.log('Skipping RLS migration: not PostgreSQL');
      return;
    }

    for (const table of TENANT_SCOPED_TABLES) {
      await sequelize.query(`
        ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;
        ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;
      `).catch((err) => {
        if (err.message && err.message.includes('does not exist')) {
          console.warn(`Table ${table} not found, skipping RLS`);
        } else throw err;
      });
    }

    for (const table of TENANT_SCOPED_TABLES) {
      const policyName = `rlsp_${table}_tenant`;
      const useSnake = table === 'hot_deals';
      const expr = useSnake ? POLICY_EXPR_SNAKE : POLICY_EXPR;
      await sequelize.query(`
        DROP POLICY IF EXISTS "${policyName}" ON "${table}";
        CREATE POLICY "${policyName}" ON "${table}"
          FOR ALL
          USING ${expr}
          WITH CHECK ${expr};
      `);
    }

    await sequelize.query(`
      ALTER TABLE "auth_users" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "auth_users" FORCE ROW LEVEL SECURITY;
    `).catch((err) => {
      if (err.message && err.message.includes('does not exist')) return;
      throw err;
    });
    await sequelize.query(`
      DROP POLICY IF EXISTS "rlsp_auth_users_tenant" ON "auth_users";
      CREATE POLICY "rlsp_auth_users_tenant" ON "auth_users"
        FOR ALL
        USING ${POLICY_EXPR}
        WITH CHECK ${POLICY_EXPR};
    `).catch((err) => {
      if (err.message && err.message.includes('does not exist')) return;
      throw err;
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    if (sequelize.getDialect() !== 'postgres') return;

    const all = [...TENANT_SCOPED_TABLES, 'auth_users'];
    for (const table of all) {
      const policyName = `rlsp_${table}_tenant`;
      await sequelize.query(`DROP POLICY IF EXISTS "${policyName}" ON "${table}";`).catch(() => {});
      await sequelize.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`).catch(() => {});
    }
  }
};
