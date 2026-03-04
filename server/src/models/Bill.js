'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Bill extends Model {
        static associate(models) {
            Bill.belongsTo(models.Tenant, {
                foreignKey: 'tenantId',
                as: 'tenant'
            });
            Bill.belongsTo(models.TenantSubscription, {
                foreignKey: 'tenantSubscriptionId',
                as: 'subscription'
            });
        }
    }

    Bill.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenantId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'tenants',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        tenantSubscriptionId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'tenant_subscriptions',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        billNumber: {
            type: DataTypes.STRING(32),
            allowNull: false,
            unique: true,
            comment: 'Human-readable e.g. INV-2025-0001'
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: 'Amount to pay in currency'
        },
        currency: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'SAR'
        },
        dueDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Payment due date'
        },
        status: {
            type: DataTypes.ENUM('UNPAID', 'PAID', 'EXPIRED'),
            allowNull: false,
            defaultValue: 'UNPAID'
        },
        paymentToken: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
            comment: 'Secure token for payment link'
        },
        paymentTokenExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Optional; can align with dueDate'
        },
        paidAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When payment was completed'
        },
        planSnapshot: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
            comment: 'Package name, billingCycle at time of bill creation'
        },
        type: {
            type: DataTypes.ENUM('initial', 'renewal', 'upgrade'),
            allowNull: false,
            defaultValue: 'initial'
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
            comment: 'e.g. upgradeFromPlanId, notes'
        }
    }, {
        sequelize,
        modelName: 'Bill',
        tableName: 'bills',
        schema: 'public',
        timestamps: true,
        indexes: [
            { fields: ['tenantId'] },
            { fields: ['tenantSubscriptionId'] },
            { fields: ['status'] },
            { fields: ['paymentToken'], unique: true },
            { fields: ['dueDate'] }
        ]
    });

    return Bill;
};
