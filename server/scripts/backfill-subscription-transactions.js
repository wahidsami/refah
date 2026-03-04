#!/usr/bin/env node
/**
 * Backfill script: Create Transaction records for existing PAID bills
 * that were paid before we added Transaction creation to the payment flow.
 *
 * Run: node scripts/backfill-subscription-transactions.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../src/models');
const { Op } = require('sequelize');

async function backfill() {
  try {
    console.log('Fetching PAID bills...');
    const paidBills = await db.Bill.findAll({
      where: { status: 'PAID' },
      include: [
        { model: db.TenantSubscription, as: 'subscription', required: true },
        { model: db.Tenant, as: 'tenant', attributes: ['id', 'name_en'] }
      ],
      order: [['paidAt', 'ASC']]
    });

    console.log(`Found ${paidBills.length} PAID bill(s)\n`);

    if (paidBills.length === 0) {
      console.log('Nothing to backfill.');
      process.exit(0);
      return;
    }

    let created = 0;
    let skipped = 0;

    for (const bill of paidBills) {
      const [existingRows] = await db.sequelize.query(
        `SELECT id FROM transactions WHERE type = 'subscription' AND status = 'completed' AND metadata->>'billId' = :billId`,
        { replacements: { billId: bill.id } }
      );
      const existing = Array.isArray(existingRows) && existingRows.length > 0;

      if (existing) {
        console.log(`  Skip: Bill ${bill.billNumber} (already has transaction)`);
        skipped++;
        continue;
      }

      const amount = parseFloat(bill.amount);
      await db.Transaction.create({
        platformUserId: null,
        tenantId: bill.tenantId,
        amount,
        currency: bill.currency || 'SAR',
        type: 'subscription',
        status: 'completed',
        platformFee: amount,
        tenantRevenue: 0,
        metadata: {
          billId: bill.id,
          billNumber: bill.billNumber,
          subscriptionId: bill.subscription?.id,
          planSnapshot: bill.planSnapshot || {},
          backfilled: true,
          backfillDate: new Date().toISOString()
        }
      });

      const tenantName = bill.tenant?.name_en || bill.tenantId;
      console.log(`  Created: Bill ${bill.billNumber} | ${tenantName} | SAR ${amount}`);
      created++;
    }

    console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

backfill();
