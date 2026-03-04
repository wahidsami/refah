'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Create staff_messages table
      await queryInterface.sequelize.query(`
          CREATE TABLE IF NOT EXISTS staff_messages (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
              sender_type VARCHAR NOT NULL, 
              sender_id UUID NOT NULL,     
              recipient_type VARCHAR,          
              recipient_id UUID,              
              subject VARCHAR(200),
              body TEXT NOT NULL,
              is_pinned BOOLEAN DEFAULT FALSE,
              read_by JSONB DEFAULT '[]', 
              created_at TIMESTAMPTZ DEFAULT NOW(),
              CONSTRAINT ck_sender_type CHECK (sender_type IN ('admin', 'staff')),
              CONSTRAINT ck_recipient_type CHECK (recipient_type IS NULL OR recipient_type IN ('staff'))
          );
      `, { transaction });

      await queryInterface.sequelize.query(`
          CREATE INDEX IF NOT EXISTS idx_staff_messages_tenant_recipient 
          ON staff_messages(tenant_id, recipient_id);
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
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_staff_messages_tenant_recipient;`, { transaction });
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS staff_messages;`, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
