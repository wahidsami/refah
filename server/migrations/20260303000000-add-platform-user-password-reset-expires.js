'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    if (sequelize.getDialect() === 'postgres') {
      await sequelize.query(`
        ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;
      `);
    } else {
      await queryInterface.addColumn('platform_users', 'password_reset_expires', {
        type: Sequelize.DATE,
        allowNull: true,
      }).catch(() => {});
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('platform_users', 'password_reset_expires').catch(() => {});
  }
};
