'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const { sequelize } = queryInterface;
        if (sequelize.getDialect() !== 'postgres') return;

        await sequelize.query(`
      ALTER TABLE staff
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR,
        ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR,
        ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS fcm_token VARCHAR,
        ADD COLUMN IF NOT EXISTS app_enabled BOOLEAN DEFAULT FALSE;
    `);
    },

    async down(queryInterface, Sequelize) {
        const { sequelize } = queryInterface;
        if (sequelize.getDialect() !== 'postgres') return;

        await sequelize.query(`
      ALTER TABLE staff
        DROP COLUMN IF EXISTS password_hash,
        DROP COLUMN IF EXISTS must_change_password,
        DROP COLUMN IF EXISTS password_reset_token,
        DROP COLUMN IF EXISTS password_reset_expires,
        DROP COLUMN IF EXISTS last_login,
        DROP COLUMN IF EXISTS fcm_token,
        DROP COLUMN IF EXISTS app_enabled;
    `);
    }
};
