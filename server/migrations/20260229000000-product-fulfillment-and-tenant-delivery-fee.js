'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'products',
            'allows_delivery',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            }
        );
        await queryInterface.addColumn(
            'products',
            'allows_pickup',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            }
        );
        await queryInterface.addColumn(
            'tenant_settings',
            'default_delivery_fee',
            {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                defaultValue: 0,
            }
        );
        await queryInterface.addColumn(
            'platform_users',
            'address_district',
            {
                type: Sequelize.STRING(100),
                allowNull: true,
            }
        );
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('products', 'allows_delivery');
        await queryInterface.removeColumn('products', 'allows_pickup');
        await queryInterface.removeColumn('tenant_settings', 'default_delivery_fee');
        await queryInterface.removeColumn('platform_users', 'address_district');
    },
};
