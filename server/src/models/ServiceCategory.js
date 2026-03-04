'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ServiceCategory extends Model {
        static associate(models) {
            // ServiceCategory can be referenced by many Services
            // For now, Services store category as a string (slug)
            // Future: Add proper foreign key relationship
        }
    }

    ServiceCategory.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name_en: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Category name in English'
        },
        name_ar: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Category name in Arabic'
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            comment: 'URL-friendly identifier, auto-generated from name_en'
        },
        icon: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Optional emoji or icon identifier'
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Controls display ordering in dropdowns and lists'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'When false, category is hidden from tenant dropdowns'
        }
    }, {
        sequelize,
        modelName: 'ServiceCategory',
        tableName: 'service_categories',
        schema: 'public',
        timestamps: true,
        hooks: {
            beforeValidate: (instance) => {
                // Auto-generate slug from name_en if not provided
                if (instance.name_en && !instance.slug) {
                    instance.slug = instance.name_en
                        .toLowerCase()
                        .replace(/[&]/g, 'and')
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '');
                }
            }
        }
    });

    return ServiceCategory;
};
