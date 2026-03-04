/**
 * Availability batched queries: ensure service_employees has index for
 * ServiceEmployee.findAll({ where: { serviceId } }) used by _getSlotsForAnyStaffBatched.
 * Optional: use CONCURRENTLY when RUN_INDEX_CONCURRENTLY=1 (run outside transaction).
 *
 * Other batched-query indexes are in 20260227000000-availability-batched-query-indexes.js.
 * Appointments and staff_schedule_overrides already have suitable indexes from earlier migrations.
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    if (sequelize.getDialect() !== 'postgres') return;

    const useConcurrent = process.env.RUN_INDEX_CONCURRENTLY === '1';
    const concurrentStr = useConcurrent ? ' CONCURRENTLY' : '';

    // CONCURRENTLY cannot run inside a transaction
    const opts = useConcurrent ? { transaction: null } : {};

    // Resolve service_employees column name (Sequelize may use "serviceId" or service_id)
    const [cols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'service_employees'
        AND column_name IN ('serviceId', 'service_id')
      LIMIT 1
    `);
    const serviceIdCol = cols && cols[0] && cols[0].column_name;
    if (!serviceIdCol) {
      console.warn('Availability indexes: service_employees table or serviceId column not found; skipping service_employees index.');
      return;
    }
    const quotedCol = serviceIdCol === 'service_id' ? 'service_id' : '"serviceId"';

    await sequelize.query(
      `CREATE INDEX${concurrentStr} IF NOT EXISTS idx_service_employees_service_id ON service_employees (${quotedCol})`,
      opts
    );
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    if (sequelize.getDialect() !== 'postgres') return;

    const useConcurrent = process.env.RUN_INDEX_CONCURRENTLY === '1';
    const concurrentStr = useConcurrent ? ' CONCURRENTLY' : '';
    const opts = useConcurrent ? { transaction: null } : {};

    await sequelize.query(`DROP INDEX${concurrentStr} IF EXISTS idx_service_employees_service_id`, opts);
  }
};
