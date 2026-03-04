/**
 * RLS pool isolation: no tenant leakage across pooled connections via Sequelize.
 * Uses sequelize.query (pool + afterPoolAcquire) and tenantContext to simulate
 * request A (tenant A) then request B (tenant B); asserts each sees only its tenant rows.
 * If DB role is superuser: skip unless RLS_TEST_REQUIRE_NON_SUPERUSER=1, then FAIL (for CI).
 */

const db = require('../src/models');
const tenantContext = require('../src/utils/tenantContext');
const { initRlsSession } = require('../src/utils/rlsSession');

describe('RLS pool isolation (Sequelize)', () => {
    let sequelize;
    let dialect;

    beforeAll(async () => {
        sequelize = db.sequelize;
        dialect = sequelize.getDialect();
        if (dialect !== 'postgres') return;
        initRlsSession(sequelize);
        try {
            await sequelize.authenticate();
        } catch (e) {
            console.warn('DB not available, skipping RLS pool isolation tests');
        }
    });

    afterAll(async () => {
        if (sequelize) await sequelize.close();
    });

    it('no tenant leakage across pooled connections (sequelize.query)', async () => {
        if (dialect !== 'postgres') return;

        const [policies] = await sequelize.query(`
            SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname LIKE 'rlsp_%' LIMIT 1
        `);
        if (!policies || policies.length === 0) {
            console.warn('RLS migration not applied to appointments, skipping');
            return;
        }

        const [superResult] = await sequelize.query(
            "SELECT rolsuper FROM pg_roles WHERE rolname = current_user"
        );
        const isSuperuser = superResult?.[0]?.rolsuper;
        if (isSuperuser) {
            if (process.env.RLS_TEST_REQUIRE_NON_SUPERUSER === '1') {
                throw new Error('CI must use non-superuser DB role to verify RLS. Superuser bypasses RLS.');
            }
            console.warn('RLS pool isolation test skipped: connected as superuser (bypasses RLS). Use a non-superuser role to verify no tenant leakage.');
            return;
        }

        const [tenants] = await sequelize.query(
            'SELECT id FROM tenants ORDER BY "createdAt" ASC LIMIT 2'
        );
        if (!tenants || tenants.length < 2) {
            console.warn('Need at least 2 tenants for RLS pool isolation test');
            return;
        }
        const tenantA = String(tenants[0].id);
        const tenantB = String(tenants[1].id);

        // Request A: run with tenant A context; acquire connection via sequelize.query
        const rowsA = await tenantContext.run({ tenantId: tenantA }, async () => {
            const [rows] = await sequelize.query(
                'SELECT id, "tenantId" FROM appointments LIMIT 500'
            );
            return rows;
        });

        // Request B: run with tenant B context
        const rowsB = await tenantContext.run({ tenantId: tenantB }, async () => {
            const [rows] = await sequelize.query(
                'SELECT id, "tenantId" FROM appointments LIMIT 500'
            );
            return rows;
        });

        for (const row of rowsA) {
            expect(row.tenantId).toBe(tenantA);
        }
        for (const row of rowsB) {
            expect(row.tenantId).toBe(tenantB);
        }
    });
});
