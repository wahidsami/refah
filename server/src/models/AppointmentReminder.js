'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class AppointmentReminder extends Model {
        static associate(models) {
            AppointmentReminder.belongsTo(models.Appointment, {
                foreignKey: 'appointmentId',
                as: 'appointment',
            });
            AppointmentReminder.belongsTo(models.PlatformUser, {
                foreignKey: 'platformUserId',
                as: 'user',
            });
        }
    }

    AppointmentReminder.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        appointmentId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'appointments', key: 'id' },
            onDelete: 'CASCADE',
            field: 'appointment_id',
        },
        platformUserId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'platform_users', key: 'id' },
            onDelete: 'CASCADE',
            field: 'platform_user_id',
        },
        reminderMinutesBefore: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 30,
            field: 'reminder_minutes_before',
        },
        sentAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'sent_at',
        },
    }, {
        sequelize,
        modelName: 'AppointmentReminder',
        tableName: 'appointment_reminders',
        underscored: true,
        timestamps: true,
        indexes: [
            { unique: true, fields: ['appointment_id'] },
            { fields: ['sent_at'] },
        ],
    });

    return AppointmentReminder;
};
