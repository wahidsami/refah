/**
 * Phase 0 booking correctness: prevent double booking at DB level.
 * Partial unique index: one active booking per (staff, start time).
 * Run with: npx sequelize-cli db:migrate
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_active_slot
      ON appointments ("staffId", "startTime")
      WHERE status NOT IN ('cancelled', 'no_show');
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_appointments_unique_active_slot;
    `);
  }
};
