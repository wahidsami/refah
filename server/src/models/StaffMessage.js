/**
 * Staff Message Model
 * Internal messaging between admin and staff.
 */

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class StaffMessage extends Model {
        static associate(models) {
            StaffMessage.belongsTo(models.Tenant, {
                foreignKey: 'tenantId',
                as: 'tenant'
            });
            // senderId could be Admin or Staff depending on senderType
            // recipientId could be Staff or null (broadcast)
        }
    }

    StaffMessage.init({
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
            onDelete: 'CASCADE',
            field: 'tenant_id'
        },
        senderType: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: "'admin' or 'staff'",
            field: 'sender_type'
        },
        senderId: {
            type: DataTypes.UUID,
            allowNull: false,
            comment: "tenantId if admin, staffId if staff",
            field: 'sender_id'
        },
        recipientType: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "NULL = broadcast to all staff",
            field: 'recipient_type'
        },
        recipientId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: "NULL = broadcast, else specific staffId",
            field: 'recipient_id'
        },
        subject: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        isPinned: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_pinned'
        },
        readBy: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: "Array of staffId UUIDs who read it",
            field: 'read_by'
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'created_at'
        }
    }, {
        sequelize,
        modelName: 'StaffMessage',
        tableName: 'staff_messages',
        schema: 'public',
        timestamps: false, // We only need createdAt for messages
        indexes: [
            {
                fields: ['tenant_id', 'recipient_id']
            },
            {
                fields: ['tenant_id', 'created_at']
            }
        ]
    });

    return StaffMessage;
};
