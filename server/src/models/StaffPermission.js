'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class StaffPermission extends Model {
        static associate(models) {
            StaffPermission.belongsTo(models.Staff, {
                foreignKey: 'staffId',
                as: 'staff'
            });
            StaffPermission.belongsTo(models.Tenant, {
                foreignKey: 'tenantId',
                as: 'tenant'
            });
        }
    }

    StaffPermission.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        staffId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'staff',
                key: 'id'
            },
            onDelete: 'CASCADE'
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
        view_earnings: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Allow staff to see their payroll, commission, and tips'
        },
        view_reviews: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Allow staff to see reviews left by customers'
        },
        reply_reviews: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Allow staff to post public replies to reviews'
        },
        view_clients: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Allow staff to see repeat clients history and private notes'
        }
    }, {
        sequelize,
        modelName: 'StaffPermission',
        tableName: 'staff_permissions',
        schema: 'public',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['staffId', 'tenantId']
            }
        ]
    });

    return StaffPermission;
};
