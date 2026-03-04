'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'tenant_settings',
            'cancellation_fee_type',
            {
                type: Sequelize.STRING(20),
                allowNull: true,
                defaultValue: 'none',
            }
        );
        await queryInterface.addColumn(
            'tenant_settings',
            'cancellation_fee_value',
            {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                defaultValue: 0,
            }
        );
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('tenant_settings', 'cancellation_fee_type');
        await queryInterface.removeColumn('tenant_settings', 'cancellation_fee_value');
    },
};
