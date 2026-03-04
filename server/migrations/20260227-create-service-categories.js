'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Create service_categories table
        await queryInterface.createTable('service_categories', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            name_en: {
                type: Sequelize.STRING,
                allowNull: false
            },
            name_ar: {
                type: Sequelize.STRING,
                allowNull: false
            },
            slug: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            icon: {
                type: Sequelize.STRING,
                allowNull: true
            },
            sortOrder: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // 2. Add indexes
        await queryInterface.addIndex('service_categories', ['slug'], { unique: true });
        await queryInterface.addIndex('service_categories', ['isActive']);
        await queryInterface.addIndex('service_categories', ['sortOrder']);

        // 3. Seed existing categories (matching the hardcoded SERVICE_CATEGORIES)
        const categories = [
            {
                id: uuidv4(),
                name_en: 'Hair Services',
                name_ar: 'خدمات الشعر',
                slug: 'hair-services',
                icon: '💇',
                sortOrder: 1,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: uuidv4(),
                name_en: 'Facial & Skin Care',
                name_ar: 'العناية بالبشرة والوجه',
                slug: 'facial-and-skin-care',
                icon: '🧖',
                sortOrder: 2,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: uuidv4(),
                name_en: 'Massage & Body',
                name_ar: 'المساج والجسم',
                slug: 'massage-and-body',
                icon: '💆',
                sortOrder: 3,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: uuidv4(),
                name_en: 'Nail Services',
                name_ar: 'خدمات الأظافر',
                slug: 'nail-services',
                icon: '💅',
                sortOrder: 4,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: uuidv4(),
                name_en: 'Makeup',
                name_ar: 'المكياج',
                slug: 'makeup',
                icon: '💄',
                sortOrder: 5,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: uuidv4(),
                name_en: 'Bridal Services',
                name_ar: 'خدمات العروس',
                slug: 'bridal-services',
                icon: '👰',
                sortOrder: 6,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: uuidv4(),
                name_en: 'General',
                name_ar: 'عام',
                slug: 'general',
                icon: '⭐',
                sortOrder: 7,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        await queryInterface.bulkInsert('service_categories', categories);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('service_categories');
    }
};
