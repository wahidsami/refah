'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    if (sequelize.getDialect() === 'postgres') {
      await sequelize.query(`
        ALTER TABLE services ADD COLUMN IF NOT EXISTS "offerFrom" DATE;
        ALTER TABLE services ADD COLUMN IF NOT EXISTS "offerTo" DATE;
      `);
    } else {
      await queryInterface.addColumn('services', 'offerFrom', { type: Sequelize.DATEONLY, allowNull: true }).catch(() => {});
      await queryInterface.addColumn('services', 'offerTo', { type: Sequelize.DATEONLY, allowNull: true }).catch(() => {});
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('services', 'offerFrom').catch(() => {});
    await queryInterface.removeColumn('services', 'offerTo').catch(() => {});
  }
};
