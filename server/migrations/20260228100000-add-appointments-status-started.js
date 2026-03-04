'use strict';

/**
 * Migration: Add 'started' to appointment status enum
 *
 * "Started" = service is in progress (customer is with the employee).
 * Staff app sets this when the employee taps "Start"; they later tap "Complete".
 *
 * Run with: npx sequelize-cli db:migrate
 * Undo with: npx sequelize-cli db:migrate:undo
 */
module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') return;

    const [rows] = await queryInterface.sequelize.query(`
      SELECT data_type, udt_name AS enum_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'status';
    `);
    const dataType = rows && rows[0] && rows[0].data_type;
    const enumType = rows && rows[0] && rows[0].enum_type;
    const isEnum = dataType === 'USER-DEFINED' && enumType;

    if (!isEnum) {
      console.warn('Appointments.status is not a PostgreSQL enum; skipping ADD VALUE.');
      return;
    }

    // ADD VALUE cannot run inside a transaction in PostgreSQL < 15
    try {
      await queryInterface.sequelize.query(
        `ALTER TYPE "${enumType}" ADD VALUE IF NOT EXISTS 'started';`
      );
    } catch (e) {
      if (e.message && !e.message.includes('already exists')) throw e;
    }
  },

  async down() {
    // PostgreSQL does not support removing an enum value without recreating the type.
    // Leaving 'started' in the enum is safe; no down migration.
  },
};
