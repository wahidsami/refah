/**
 * Billing cron: expire unpaid bills and suspend subscriptions/tenants after grace period.
 * Run every hour (or daily) via node-cron, PM2 cron, or external scheduler.
 */

const db = require('../models');
const { Op } = require('sequelize');
const { sendSuspendedEmail } = require('../utils/emailService');

async function expireUnpaidBills() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const updated = await db.Bill.update(
        { status: 'EXPIRED' },
        {
            where: {
                status: 'UNPAID',
                dueDate: { [Op.lt]: today }
            }
        }
    );
    if (updated[0] > 0) {
        console.log(`[BillingCron] Expired ${updated[0]} unpaid bill(s).`);
    }
    return updated[0];
}

async function suspendAfterGrace() {
    const now = new Date();
    const subs = await db.TenantSubscription.findAll({
        where: {
            status: 'APPROVED_PENDING_PAYMENT',
            gracePeriodEnds: { [Op.lt]: now }
        },
        include: [{ model: db.Tenant, as: 'tenant' }]
    });

    let count = 0;
    for (const sub of subs) {
        await sub.update({ status: 'suspended' });
        await db.Tenant.update(
            { status: 'suspended' },
            { where: { id: sub.tenantId } }
        );
        count++;
        const tenant = sub.tenant;
        if (tenant && tenant.email) {
            const unpaidBill = await db.Bill.findOne({
                where: { tenantId: sub.tenantId, status: 'UNPAID' }
            });
            sendSuspendedEmail(tenant, { billNumber: unpaidBill?.billNumber || '' }).catch((err) =>
                console.error('[BillingCron] Failed to send suspended email:', err.message)
            );
        }
    }
    if (count > 0) {
        console.log(`[BillingCron] Suspended ${count} subscription(s) and tenant(s) after grace.`);
    }
    return count;
}

async function run() {
    try {
        await expireUnpaidBills();
        await suspendAfterGrace();
    } catch (error) {
        console.error('[BillingCron] Error:', error);
        throw error;
    }
}

module.exports = { run, expireUnpaidBills, suspendAfterGrace };
