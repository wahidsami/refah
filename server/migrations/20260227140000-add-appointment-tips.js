'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const sequelize = queryInterface.sequelize;
        if (sequelize.getDialect() === 'postgres') {
            await sequelize.query(`
                ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10,2);
                ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tip_paid_at TIMESTAMPTZ;
                ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tip_payment_method VARCHAR(255);
            `);
        } else {
            await queryInterface.addColumn('appointments', 'tip_amount', { type: Sequelize.DECIMAL(10, 2), allowNull: true }).catch(() => {});
            await queryInterface.addColumn('appointments', 'tip_paid_at', { type: Sequelize.DATE, allowNull: true }).catch(() => {});
            await queryInterface.addColumn('appointments', 'tip_payment_method', { type: Sequelize.STRING, allowNull: true }).catch(() => {});
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('appointments', 'tip_amount').catch(() => {});
        await queryInterface.removeColumn('appointments', 'tip_paid_at').catch(() => {});
        await queryInterface.removeColumn('appointments', 'tip_payment_method').catch(() => {});
    }
};
