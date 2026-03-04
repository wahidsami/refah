'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('appointments', 'tip_amount', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
        });
        await queryInterface.addColumn('appointments', 'tip_paid_at', {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: null,
        });
        await queryInterface.addColumn('appointments', 'tip_payment_method', {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('appointments', 'tip_amount');
        await queryInterface.removeColumn('appointments', 'tip_paid_at');
        await queryInterface.removeColumn('appointments', 'tip_payment_method');
    }
};
