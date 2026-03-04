'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        const dialect = queryInterface.sequelize.getDialect();

        try {
            // 1. Add approvedAt, approvedByAdminId to tenant_subscriptions (idempotent: IF NOT EXISTS)
            if (dialect === 'postgres') {
                await queryInterface.sequelize.query(
                    `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMPTZ;`,
                    { transaction }
                );
                await queryInterface.sequelize.query(
                    `ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS "approvedByAdminId" UUID;`,
                    { transaction }
                );
            } else {
                await queryInterface.addColumn(
                    'tenant_subscriptions',
                    'approvedAt',
                    { type: Sequelize.DATE, allowNull: true },
                    { transaction }
                );
                await queryInterface.addColumn(
                    'tenant_subscriptions',
                    'approvedByAdminId',
                    { type: Sequelize.UUID, allowNull: true },
                    { transaction }
                );
            }

            // 3. Create bills table (raw SQL for full control)
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS bills (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    "tenantId" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                    "tenantSubscriptionId" UUID NOT NULL REFERENCES tenant_subscriptions(id) ON DELETE CASCADE,
                    "billNumber" VARCHAR(32) NOT NULL UNIQUE,
                    amount DECIMAL(10,2) NOT NULL,
                    currency VARCHAR(3) NOT NULL DEFAULT 'SAR',
                    "dueDate" DATE NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PAID', 'EXPIRED')),
                    "paymentToken" VARCHAR(64) NOT NULL UNIQUE,
                    "paymentTokenExpiresAt" TIMESTAMPTZ,
                    "paidAt" TIMESTAMPTZ,
                    "planSnapshot" JSONB DEFAULT '{}',
                    type VARCHAR(20) NOT NULL DEFAULT 'initial' CHECK (type IN ('initial', 'renewal', 'upgrade')),
                    metadata JSONB DEFAULT '{}',
                    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `, { transaction });

            await queryInterface.sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_bills_tenant_id ON bills("tenantId");
                CREATE INDEX IF NOT EXISTS idx_bills_tenant_subscription_id ON bills("tenantSubscriptionId");
                CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
                CREATE UNIQUE INDEX IF NOT EXISTS idx_bills_payment_token ON bills("paymentToken");
                CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills("dueDate");
            `, { transaction });

            await transaction.commit();

            // 2. Add new enum values for status (PostgreSQL). Run OUTSIDE transaction so it works on PG < 12.
            if (dialect === 'postgres') {
                const [rows] = await queryInterface.sequelize.query(
                    `SELECT data_type, udt_name AS enum_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenant_subscriptions' AND column_name = 'status';`
                );
                const dataType = rows && rows[0] && rows[0].data_type;
                const enumType = rows && rows[0] && rows[0].enum_type;
                const isUserDefinedEnum = dataType === 'USER-DEFINED' && enumType && !['varchar', 'character varying'].includes(enumType);
                if (isUserDefinedEnum) {
                    const newValues = ['PENDING_APPROVAL', 'APPROVED_FREE_ACTIVE', 'APPROVED_PENDING_PAYMENT'];
                    for (const val of newValues) {
                        try {
                            await queryInterface.sequelize.query(
                                `ALTER TYPE "${enumType}" ADD VALUE '${val}';`
                            );
                        } catch (e) {
                            if (e.message && !e.message.includes('already exists')) throw e;
                        }
                    }
                }
            }
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    down: async (queryInterface) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.sequelize.query('DROP TABLE IF EXISTS bills;', { transaction });
            await queryInterface.removeColumn('tenant_subscriptions', 'approvedByAdminId', { transaction });
            await queryInterface.removeColumn('tenant_subscriptions', 'approvedAt', { transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};
