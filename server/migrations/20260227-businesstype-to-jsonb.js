'use strict';

/**
 * Migration: Convert businessType from ENUM to JSONB array (or add as JSONB if column missing).
 * This allows tenants to have multiple business types (e.g. ["salon", "spa"])
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const sequelize = queryInterface.sequelize;
        const dialect = sequelize.getDialect();
        if (dialect !== 'postgres') return;

        const [rows] = await sequelize.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'businessType'
        `);
        const hasBusinessType = rows && rows.length > 0;

        if (hasBusinessType) {
            await queryInterface.addColumn('tenants', 'businessType_new', {
                type: Sequelize.JSONB,
                allowNull: true
            });
            await sequelize.query(`
                UPDATE tenants
                SET "businessType_new" = CASE
                    WHEN "businessType" IS NOT NULL THEN jsonb_build_array("businessType"::text)
                    ELSE '["salon"]'::jsonb
                END
            `);
            await queryInterface.removeColumn('tenants', 'businessType');
            await queryInterface.renameColumn('tenants', 'businessType_new', 'businessType');
            await queryInterface.changeColumn('tenants', 'businessType', {
                type: Sequelize.JSONB,
                allowNull: false,
                defaultValue: ['salon']
            });
            await sequelize.query(`DROP TYPE IF EXISTS "enum_tenants_businessType";`);
        } else {
            await sequelize.query(`
                ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "businessType" JSONB NOT NULL DEFAULT '["salon"]'::jsonb;
            `);
        }
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
