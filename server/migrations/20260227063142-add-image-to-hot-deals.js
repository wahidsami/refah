'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    if (sequelize.getDialect() !== 'postgres') {
      await queryInterface.addColumn('hot_deals', 'image', {
        type: Sequelize.STRING,
        allowNull: true
      }).catch(() => {});
      return;
    }
    await sequelize.query(`
      ALTER TABLE hot_deals ADD COLUMN IF NOT EXISTS image VARCHAR(255);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('hot_deals', 'image').catch(() => {});
  }
};
