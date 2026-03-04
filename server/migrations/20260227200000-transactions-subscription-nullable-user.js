'use strict';

/**
 * Migration: Add subscription type to transactions, make platformUserId nullable
 * - Subscription payments have no platform user (tenant pays, not end customer)
 * - Enables tracking subscription revenue in admin financial dashboard
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Add 'subscription' to transactions type enum
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_transactions_type" ADD VALUE IF NOT EXISTS 'subscription';`,
        { transaction }
      );

      // Make platform_user_id nullable (for subscription payments)
      await queryInterface.changeColumn(
        'transactions',
        'platformUserId',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'platform_users', key: 'id' },
        },
        { transaction }
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    // Cannot remove enum value in PostgreSQL easily; revert platform_user_id
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.changeColumn(
        'transactions',
        'platformUserId',
        {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'platform_users', key: 'id' },
        },
        { transaction }
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
