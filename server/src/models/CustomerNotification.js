'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class CustomerNotification extends Model {
        static associate(models) {
            CustomerNotification.belongsTo(models.PlatformUser, { foreignKey: 'platformUserId', as: 'platformUser' });
            CustomerNotification.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
        }
    }

    CustomerNotification.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        platformUserId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'platform_user_id',
            references: { model: 'platform_users', key: 'id' },
            onDelete: 'CASCADE'
        },
        tenantId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'tenant_id',
            references: { model: 'tenants', key: 'id' },
            onDelete: 'SET NULL'
        },
        type: {
            type: DataTypes.STRING(64),
            allowNull: false
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        data: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        readAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'read_at'
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('NOW()'),
            field: 'created_at'
        }
    }, {
        sequelize,
        modelName: 'CustomerNotification',
        tableName: 'customer_notifications',
        schema: 'public',
        timestamps: false,
        updatedAt: false,
        indexes: [
            { fields: ['platform_user_id', 'created_at'], name: 'idx_customer_notifications_user_created' }
        ]
    });

    return CustomerNotification;
};
