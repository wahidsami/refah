'use strict';

/** Drop leftover column from businessType ENUM→JSONB migration */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    if (sequelize.getDialect() !== 'postgres') return;
    await sequelize.query(`
      ALTER TABLE tenants DROP COLUMN IF EXISTS "businessType_new";
    `).catch(() => {});
  },
  async down() {}
};
