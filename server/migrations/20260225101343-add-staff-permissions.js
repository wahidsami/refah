'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('staff_permissions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      staffId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'staff',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      view_earnings: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      view_reviews: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      reply_reviews: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      view_clients: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Ensure a staff member only has one permission record per tenant
    await queryInterface.addIndex('staff_permissions', ['staffId', 'tenantId'], {
      unique: true,
      name: 'staff_permissions_unique_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('staff_permissions');
  }
};
