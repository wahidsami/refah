'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class FeaturePricing extends Model {
        static associate(models) {
            // No associations needed for now
        }
    }

    FeaturePricing.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        featureKey: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
            comment: 'System key for the feature (e.g., subscriptionFee, maxStaff)'
        },
        label: {
            type: DataTypes.STRING(128),
            allowNull: false,
            comment: 'Display name in English'
        },
        unitLabel: {
            type: DataTypes.STRING(64),
            allowNull: false,
            comment: 'Display label for the billed unit (e.g., per month, per booking)'
        },
        unitPrice: {
            type: DataTypes.DECIMAL(12, 6),
            allowNull: false,
            defaultValue: 0.000000,
            comment: 'Price per unit in SAR'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Whether this feature pricing is active'
        }
    }, {
        sequelize,
        modelName: 'FeaturePricing',
        tableName: 'FeaturePricings',
        timestamps: true
    });

    return FeaturePricing;
};
