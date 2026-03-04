'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Create reviews table
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
          appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
          customer_name VARCHAR,
          rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
          comment TEXT,
          staff_reply TEXT,
          staff_replied_at TIMESTAMPTZ,
          is_visible BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_reviews_tenant_staff ON reviews(tenant_id, staff_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_tenant_created ON reviews(tenant_id, created_at);
      `, { transaction });

      // 2. Create staff_payrolls table
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS staff_payrolls (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          base_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
          commission DECIMAL(10,2) NOT NULL DEFAULT 0,
          tips_total DECIMAL(10,2) NOT NULL DEFAULT 0,
          bonuses DECIMAL(10,2) NOT NULL DEFAULT 0,
          deductions DECIMAL(10,2) NOT NULL DEFAULT 0,
          status VARCHAR DEFAULT 'draft',
          notes TEXT,
          paid_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(staff_id, period_start)
        );
      `, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS staff_payrolls;`, { transaction });
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_reviews_tenant_staff;`, { transaction });
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_reviews_tenant_created;`, { transaction });
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS reviews;`, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
