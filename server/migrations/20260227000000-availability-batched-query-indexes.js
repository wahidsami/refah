/**
 * Indexes for availability search batched queries (availabilityService._getSlotsForAnyStaffBatched).
 * Aligns to WHERE clauses only; no guessing. Run: npx sequelize-cli db:migrate
 *
 * For production zero-downtime: set RUN_INDEX_CONCURRENTLY=1 (PowerShell: $env:RUN_INDEX_CONCURRENTLY = "1"; then db:migrate)
 * (Creates indexes with CONCURRENTLY; cannot run inside a transaction.)
 *
 * EXPLAIN-worthy query shapes (columns in WHERE):
 * 1) staff_shifts (date-specific): WHERE staff_id IN (?), specific_date = ?, is_active = true, is_recurring = false
 * 2) staff_shifts (recurring):     WHERE staff_id IN (?), day_of_week = ?, is_recurring = true, is_active = true, start_date/end_date range
 * 3) staff_schedules (legacy):    WHERE "staffId" IN (?), "dayOfWeek" = ?, "isAvailable" = true
 * 4) staff_breaks (date-specific): WHERE staff_id IN (?), specific_date = ?, is_active = true, is_recurring = false
 * 5) staff_breaks (recurring):     WHERE staff_id IN (?), day_of_week = ?, is_recurring = true, is_active = true, start_date/end_date range
 * 6) staff_time_off:               WHERE staff_id IN (?), is_approved = true, start_date <= ?, end_date >= ?
 * 7) staff_schedule_overrides:     WHERE staff_id IN (?), date = ?  (already has idx_staff_overrides_staff_date)
 * 8) appointments:                WHERE "tenantId" = ?, "staffId" IN (?), "startTime" BETWEEN ? AND ?, status NOT IN (...) (already has idx_appointments_tenant_staff_start)
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    if (sequelize.getDialect() !== 'postgres') return;

    const useConcurrent = process.env.RUN_INDEX_CONCURRENTLY === '1';
    const concurrentStr = useConcurrent ? ' CONCURRENTLY' : '';
    const opts = useConcurrent ? { transaction: null } : {};

    await sequelize.query(`
      CREATE INDEX${concurrentStr} IF NOT EXISTS idx_staff_shifts_staff_specific_active_recurring
      ON staff_shifts (staff_id, specific_date, is_active, is_recurring)
    `, opts);
    await sequelize.query(`
      CREATE INDEX${concurrentStr} IF NOT EXISTS idx_staff_shifts_staff_day_recurring_active
      ON staff_shifts (staff_id, day_of_week, is_recurring, is_active)
    `, opts);
    await sequelize.query(`
      CREATE INDEX${concurrentStr} IF NOT EXISTS idx_staff_breaks_staff_specific_active_recurring
      ON staff_breaks (staff_id, specific_date, is_active, is_recurring)
    `, opts);
    await sequelize.query(`
      CREATE INDEX${concurrentStr} IF NOT EXISTS idx_staff_breaks_staff_day_recurring_active
      ON staff_breaks (staff_id, day_of_week, is_recurring, is_active)
    `, opts);
    await sequelize.query(`
      CREATE INDEX${concurrentStr} IF NOT EXISTS idx_staff_time_off_staff_approved_dates
      ON staff_time_off (staff_id, is_approved, start_date, end_date)
    `, opts);
    const [schedCols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'staff_schedules' AND column_name IN ('staffId', 'staff_id')
      LIMIT 1
    `);
    const staffSchedSnake = schedCols && schedCols[0] && schedCols[0].column_name === 'staff_id';
    if (staffSchedSnake) {
      await sequelize.query(`
        CREATE INDEX${concurrentStr} IF NOT EXISTS idx_staff_schedules_staff_day_available
        ON staff_schedules (staff_id, day_of_week, is_available)
      `, opts);
    } else {
      await sequelize.query(`
        CREATE INDEX${concurrentStr} IF NOT EXISTS idx_staff_schedules_staff_day_available
        ON staff_schedules ("staffId", "dayOfWeek", "isAvailable")
      `, opts);
    }
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    if (sequelize.getDialect() !== 'postgres') return;

    const useConcurrent = process.env.RUN_INDEX_CONCURRENTLY === '1';
    const concurrentStr = useConcurrent ? ' CONCURRENTLY' : '';
    const opts = useConcurrent ? { transaction: null } : {};

    await sequelize.query(`DROP INDEX${concurrentStr} IF EXISTS idx_staff_shifts_staff_specific_active_recurring`, opts);
    await sequelize.query(`DROP INDEX${concurrentStr} IF EXISTS idx_staff_shifts_staff_day_recurring_active`, opts);
    await sequelize.query(`DROP INDEX${concurrentStr} IF EXISTS idx_staff_breaks_staff_specific_active_recurring`, opts);
    await sequelize.query(`DROP INDEX${concurrentStr} IF EXISTS idx_staff_breaks_staff_day_recurring_active`, opts);
    await sequelize.query(`DROP INDEX${concurrentStr} IF EXISTS idx_staff_time_off_staff_approved_dates`, opts);
    await sequelize.query(`DROP INDEX${concurrentStr} IF EXISTS idx_staff_schedules_staff_day_available`, opts);
  }
};
