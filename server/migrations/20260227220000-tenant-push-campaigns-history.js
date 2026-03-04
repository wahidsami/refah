'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tenant_push_campaigns', {
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
        allowNull: true,
        comment: 'linkType, serviceId, etc.'
      },
      audience_type: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'selected'
      },
      recipient_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });
    await queryInterface.addIndex('tenant_push_campaigns', ['tenant_id', 'sent_at'], { name: 'idx_tenant_push_campaigns_tenant_sent' });

    await queryInterface.createTable('tenant_push_campaign_recipients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      campaign_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenant_push_campaigns', key: 'id' },
        onDelete: 'CASCADE'
      },
      platform_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'platform_users', key: 'id' },
        onDelete: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });
    await queryInterface.addIndex('tenant_push_campaign_recipients', ['campaign_id'], { name: 'idx_tenant_push_campaign_recipients_campaign' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tenant_push_campaign_recipients');
    await queryInterface.dropTable('tenant_push_campaigns');
  }
};
