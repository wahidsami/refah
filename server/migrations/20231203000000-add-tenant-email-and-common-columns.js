/**
 * Adds "email" column to tenants (required by Tenant model unique index).
 * Minimal tenants table had no email; sync failed creating index tenants_email.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    if (sequelize.getDialect() !== 'postgres') return;

    await sequelize.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    `);
  },

  async down() {}
};
