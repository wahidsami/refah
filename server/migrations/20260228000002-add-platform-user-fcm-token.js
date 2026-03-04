'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    if (sequelize.getDialect() === 'postgres') {
      await sequelize.query(`
        ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255);
      `);
    } else {
      await queryInterface.addColumn('platform_users', 'fcm_token', {
        type: Sequelize.STRING,
        allowNull: true,
      }).catch(() => {});
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('platform_users', 'fcm_token').catch(() => {});
  }
};
