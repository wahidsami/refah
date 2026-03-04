'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const sequelize = queryInterface.sequelize;
        if (sequelize.getDialect() === 'postgres') {
            await sequelize.query(`
                ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS cancellation_fee_type VARCHAR(20) DEFAULT 'none';
                ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS cancellation_fee_value DECIMAL(10,2) DEFAULT 0;
            `);
        } else {
            await queryInterface.addColumn('tenant_settings', 'cancellation_fee_type', {
                type: Sequelize.STRING(20),
                allowNull: true,
                defaultValue: 'none',
            }).catch(() => {});
            await queryInterface.addColumn('tenant_settings', 'cancellation_fee_value', {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                defaultValue: 0,
            }).catch(() => {});
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('tenant_settings', 'cancellation_fee_type').catch(() => {});
        await queryInterface.removeColumn('tenant_settings', 'cancellation_fee_value').catch(() => {});
    },
};
