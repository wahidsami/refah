'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const sequelize = queryInterface.sequelize;
        if (sequelize.getDialect() === 'postgres') {
            await sequelize.query(`
                ALTER TABLE products ADD COLUMN IF NOT EXISTS allows_delivery BOOLEAN NOT NULL DEFAULT true;
                ALTER TABLE products ADD COLUMN IF NOT EXISTS allows_pickup BOOLEAN NOT NULL DEFAULT true;
                ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS default_delivery_fee DECIMAL(10,2) DEFAULT 0;
                ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS address_district VARCHAR(100);
            `);
        } else {
            await queryInterface.addColumn('products', 'allows_delivery', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }).catch(() => {});
            await queryInterface.addColumn('products', 'allows_pickup', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }).catch(() => {});
            await queryInterface.addColumn('tenant_settings', 'default_delivery_fee', { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 }).catch(() => {});
            await queryInterface.addColumn('platform_users', 'address_district', { type: Sequelize.STRING(100), allowNull: true }).catch(() => {});
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('products', 'allows_delivery').catch(() => {});
        await queryInterface.removeColumn('products', 'allows_pickup').catch(() => {});
        await queryInterface.removeColumn('tenant_settings', 'default_delivery_fee').catch(() => {});
        await queryInterface.removeColumn('platform_users', 'address_district').catch(() => {});
    },
};
