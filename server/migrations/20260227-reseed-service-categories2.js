'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Migration: Reseed Service Categories
 * Replaces the initial 7 categories with a comprehensive bilingual list of 21 categories.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Clear existing categories
        await queryInterface.bulkDelete('service_categories', null, {});

        // 2. Prepare the new 21 categories
        const newCategories = [
            { name_en: 'Hair and styling', name_ar: 'تصفيف الشعر', slug: 'hair-and-styling', icon: '💇' },
            { name_en: 'Nails', name_ar: 'الأظافر', slug: 'nails', icon: '💅' },
            { name_en: 'Brows & lashes', name_ar: 'الحواجب والرموش', slug: 'brows-and-lashes', icon: '✨' },
            { name_en: 'Hair removal', name_ar: 'إزالة الشعر', slug: 'hair-removal', icon: '🪒' },
            { name_en: 'Massage', name_ar: 'التدليك', slug: 'massage', icon: '💆' },
            { name_en: 'Facials', name_ar: 'العناية بالوجه', slug: 'facials', icon: '🧖' },
            { name_en: 'Spa & sauna', name_ar: 'سبا وساونا', slug: 'spa-and-sauna', icon: '🛁' },
            { name_en: 'Barbering', name_ar: 'الحلاقة الرجالية', slug: 'barbering', icon: '💈' },
            { name_en: 'Body', name_ar: 'العناية بالجسم', slug: 'body', icon: '🧘' },
            { name_en: 'Aesthetics', name_ar: 'التجميل', slug: 'aesthetics', icon: '💄' },
            { name_en: 'Makeup', name_ar: 'المكياج', slug: 'makeup', icon: '💋' },
            { name_en: 'Tattoos & piercings', name_ar: 'الوشم والثقب', slug: 'tattoos-and-piercings', icon: '💉' },
            { name_en: 'Medical', name_ar: 'طبي', slug: 'medical', icon: '🏥' },
            { name_en: 'Dental', name_ar: 'طب الأسنان', slug: 'dental', icon: '🦷' },
            { name_en: 'Chiropractic', name_ar: 'تقويم العمود الفقري', slug: 'chiropractic', icon: '🦴' },
            { name_en: 'Physical therapy', name_ar: 'العلاج الطبيعي', slug: 'physical-therapy', icon: '🏃' },
            { name_en: 'Fitness', name_ar: 'اللياقة البدنية', slug: 'fitness', icon: '💪' },
            { name_en: 'Nutrition', name_ar: 'التغذية', slug: 'nutrition', icon: '🍎' },
            { name_en: 'Mental Health', name_ar: 'الصحة النفسية', slug: 'mental-health', icon: '🧠' },
            { name_en: 'Holistic health', name_ar: 'الصحة الشمولية', slug: 'holistic-health', icon: '🌿' },
            { name_en: 'Pets', name_ar: 'الحيوانات الأليفة', slug: 'pets', icon: '🐾' }
        ].map((category, index) => ({
            id: uuidv4(),
            name_en: category.name_en,
            name_ar: category.name_ar,
            slug: category.slug,
            icon: category.icon,
            sortOrder: index + 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }));

        // 3. Insert the new categories
        await queryInterface.bulkInsert('service_categories', newCategories);

        console.log(`✅ Successfully seeded ${newCategories.length} service categories.`);
    },

    async down(queryInterface, Sequelize) {
        // Clear all
        await queryInterface.bulkDelete('service_categories', null, {});

        // Restore original 7 categories
        const originalCategories = [
            { id: uuidv4(), name_en: 'Hair Services', name_ar: 'خدمات الشعر', slug: 'hair-services', icon: '💇', sortOrder: 1, isActive: true, createdAt: new Date(), updatedAt: new Date() },
            { id: uuidv4(), name_en: 'Facial & Skin Care', name_ar: 'العناية بالبشرة والوجه', slug: 'facial-and-skin-care', icon: '🧖', sortOrder: 2, isActive: true, createdAt: new Date(), updatedAt: new Date() },
            { id: uuidv4(), name_en: 'Massage & Body', name_ar: 'المساج والجسم', slug: 'massage-and-body', icon: '💆', sortOrder: 3, isActive: true, createdAt: new Date(), updatedAt: new Date() },
            { id: uuidv4(), name_en: 'Nail Services', name_ar: 'خدمات الأظافر', slug: 'nail-services', icon: '💅', sortOrder: 4, isActive: true, createdAt: new Date(), updatedAt: new Date() },
            { id: uuidv4(), name_en: 'Makeup', name_ar: 'المكياج', slug: 'makeup', icon: '💄', sortOrder: 5, isActive: true, createdAt: new Date(), updatedAt: new Date() },
            { id: uuidv4(), name_en: 'Bridal Services', name_ar: 'خدمات العروس', slug: 'bridal-services', icon: '👰', sortOrder: 6, isActive: true, createdAt: new Date(), updatedAt: new Date() },
            { id: uuidv4(), name_en: 'General', name_ar: 'عام', slug: 'general', icon: '⭐', sortOrder: 7, isActive: true, createdAt: new Date(), updatedAt: new Date() }
        ];

        await queryInterface.bulkInsert('service_categories', originalCategories);
    }
};
