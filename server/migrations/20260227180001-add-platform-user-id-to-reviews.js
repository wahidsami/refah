'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('reviews', 'platform_user_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'platform_users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('reviews', ['platform_user_id'], { name: 'idx_reviews_platform_user_id' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('reviews', 'idx_reviews_platform_user_id');
    await queryInterface.removeColumn('reviews', 'platform_user_id');
  }
};
