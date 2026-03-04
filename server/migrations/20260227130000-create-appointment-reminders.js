'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('appointment_reminders', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            appointment_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'appointments', key: 'id' },
                onDelete: 'CASCADE',
            },
            platform_user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'platform_users', key: 'id' },
                onDelete: 'CASCADE',
            },
            reminder_minutes_before: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 30,
            },
            sent_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            created_at: { type: Sequelize.DATE, allowNull: false },
            updated_at: { type: Sequelize.DATE, allowNull: false },
        });
        await queryInterface.addIndex('appointment_reminders', ['appointment_id'], { unique: true });
        await queryInterface.addIndex('appointment_reminders', ['sent_at']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('appointment_reminders');
    },
};
