'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    if (sequelize.getDialect() === 'postgres') {
      await sequelize.query(`
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS platform_user_id UUID REFERENCES platform_users(id) ON UPDATE CASCADE ON DELETE SET NULL;
      `);
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_reviews_platform_user_id ON reviews(platform_user_id);
      `);
    } else {
      await queryInterface.addColumn('reviews', 'platform_user_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'platform_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }).catch(() => {});
      await queryInterface.addIndex('reviews', ['platform_user_id'], { name: 'idx_reviews_platform_user_id' }).catch(() => {});
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('reviews', 'idx_reviews_platform_user_id').catch(() => {});
    await queryInterface.removeColumn('reviews', 'platform_user_id').catch(() => {});
  }
};
