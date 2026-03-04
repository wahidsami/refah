'use strict';

/**
 * Migration: Convert businessType from ENUM to JSONB array
 * This allows tenants to have multiple business types (e.g. ["salon", "spa"])
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Step 1: Add a temporary JSONB column
        await queryInterface.addColumn('tenants', 'businessType_new', {
            type: Sequelize.JSONB,
            allowNull: true
        });

        // Step 2: Migrate existing ENUM values to JSONB arrays
        await queryInterface.sequelize.query(`
      UPDATE tenants
      SET "businessType_new" = CASE
        WHEN "businessType" IS NOT NULL THEN jsonb_build_array("businessType"::text)
        ELSE '["salon"]'::jsonb
      END
    `);

        // Step 3: Drop the old ENUM column
        await queryInterface.removeColumn('tenants', 'businessType');

        // Step 4: Rename the new column to businessType
        await queryInterface.renameColumn('tenants', 'businessType_new', 'businessType');

        // Step 5: Set default and not null
        await queryInterface.changeColumn('tenants', 'businessType', {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: ['salon']
        });

        // Step 6: Drop the old ENUM type (cleanup)
        await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_tenants_businessType";
    `);

        console.log('✅ businessType converted from ENUM to JSONB array');
    },

    async down(queryInterface, Sequelize) {
        // Revert: Convert back to ENUM (takes first element of array)
        await queryInterface.addColumn('tenants', 'businessType_old', {
            type: Sequelize.ENUM('salon', 'spa', 'barbershop', 'beauty_center', 'clinic', 'nail_studio', 'other'),
            defaultValue: 'salon'
        });

        await queryInterface.sequelize.query(`
      UPDATE tenants
      SET "businessType_old" = COALESCE(("businessType"->>0)::text, 'salon')::\"enum_tenants_businessType\"
    `);

        await queryInterface.removeColumn('tenants', 'businessType');
        await queryInterface.renameColumn('tenants', 'businessType_old', 'businessType');
    }
};
