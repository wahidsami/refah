'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('customer_notifications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      platform_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'platform_users', key: 'id' },
        onDelete: 'CASCADE'
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onDelete: 'SET NULL'
      },
      type: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });
    await queryInterface.addIndex('customer_notifications', ['platform_user_id', 'created_at'], { name: 'idx_customer_notifications_user_created' });

    await queryInterface.createTable('tenant_push_usage', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onDelete: 'CASCADE'
      },
      month: {
        type: Sequelize.STRING(7),
        allowNull: false
      },
      count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });
    await queryInterface.addIndex('tenant_push_usage', ['tenant_id', 'month'], { unique: true, name: 'idx_tenant_push_usage_tenant_month' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('customer_notifications');
    await queryInterface.dropTable('tenant_push_usage');
  }
};
