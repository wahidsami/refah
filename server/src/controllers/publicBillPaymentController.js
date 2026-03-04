/**
 * Public bill payment (token-based, no auth)
 * GET by token: invoice details, idempotent "already paid"
 * POST by token: fake pay → mark bill PAID, activate subscription, send email
 */

const db = require('../models');

/**
 * GET /api/v1/public/bills/by-token/:token
 * Return invoice details for payment page. Amount is read-only. If already PAID, return alreadyPaid: true.
 */
exports.getBillByToken = async (req, res) => {
    try {
        const { token } = req.params;

        const bill = await db.Bill.findOne({
            where: { paymentToken: token },
            include: [
                { model: db.Tenant, as: 'tenant', attributes: ['id', 'name_en', 'name_ar', 'email'] },
                { model: db.TenantSubscription, as: 'subscription', include: [{ model: db.SubscriptionPackage, as: 'package', attributes: ['name', 'name_ar'] }] }
            ]
        });

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired payment link'
            });
        }

        if (bill.status === 'PAID') {
            return res.json({
                success: true,
                alreadyPaid: true,
                message: 'This bill has already been paid',
                bill: {
                    billNumber: bill.billNumber,
                    amount: parseFloat(bill.amount),
                    currency: bill.currency,
                    paidAt: bill.paidAt,
                    planSnapshot: bill.planSnapshot
                }
            });
        }

        if (bill.status === 'EXPIRED') {
            return res.status(400).json({
                success: false,
                message: 'This payment link has expired',
                expired: true
            });
        }

        const dueDate = new Date(bill.dueDate);
        if (dueDate < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Payment is past due',
                expired: true
            });
        }

        res.json({
            success: true,
            alreadyPaid: false,
            bill: {
                id: bill.id,
                billNumber: bill.billNumber,
                amount: parseFloat(bill.amount),
                currency: bill.currency,
                dueDate: bill.dueDate,
                planSnapshot: bill.planSnapshot || {},
                type: bill.type
            }
        });
    } catch (error) {
        console.error('getBillByToken error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load invoice'
        });
    }
};

/**
 * POST /api/v1/public/bills/by-token/:token/pay
 * Body: { cardNumber?, expiry?, cvc?, holderName? } (fake; all optional for demo)
 * Marks bill PAID, sets subscription ACTIVE, sets period dates, sends payment success email.
 */
exports.payBillByToken = async (req, res) => {
    try {
        const { token } = req.params;

        const bill = await db.Bill.findOne({
            where: { paymentToken: token },
            include: [
                { model: db.Tenant, as: 'tenant' },
                { model: db.TenantSubscription, as: 'subscription', include: [{ model: db.SubscriptionPackage, as: 'package' }] }
            ]
        });

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired payment link'
            });
        }

        if (bill.status === 'PAID') {
            return res.json({
                success: true,
                alreadyPaid: true,
                message: 'This bill has already been paid',
                bill: { billNumber: bill.billNumber }
            });
        }

        if (bill.status === 'EXPIRED') {
            return res.status(400).json({
                success: false,
                message: 'This payment link has expired'
            });
        }

        const dueDate = new Date(bill.dueDate);
        if (dueDate < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Payment is past due'
            });
        }

        const subscription = bill.subscription;
        const pkg = subscription && subscription.package ? subscription.package : null;

        const now = new Date();
        let periodEnd = new Date(now);
        if (subscription.billingCycle === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
        else if (subscription.billingCycle === 'sixMonth') periodEnd.setMonth(periodEnd.getMonth() + 6);
        else if (subscription.billingCycle === 'annual') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        else periodEnd.setMonth(periodEnd.getMonth() + 1);

        const amount = parseFloat(bill.amount);

        await db.sequelize.transaction(async (t) => {
            await bill.update(
                { status: 'PAID', paidAt: now },
                { transaction: t }
            );
            await subscription.update(
                {
                    status: 'active',
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    nextBillingDate: periodEnd,
                    gracePeriodEnds: null
                },
                { transaction: t }
            );

            // Record subscription payment in transactions for admin financial dashboard
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
                    subscriptionId: subscription.id,
                    planSnapshot: bill.planSnapshot || {}
                }
            }, { transaction: t });

            let usage = await db.TenantUsage.findOne({ where: { tenantId: bill.tenantId }, transaction: t });
            if (!usage) {
                await db.TenantUsage.create({
                    tenantId: bill.tenantId,
                    currentPeriod: now.toISOString().substring(0, 7),
                    bookingsThisMonth: 0,
                    bookingsTotal: 0,
                    activeStaff: 0,
                    activeServices: 0,
                    activeProducts: 0,
                    storageUsedMB: 0,
                    emailCampaignsThisMonth: 0,
                    smsCampaignsThisMonth: 0,
                    apiCallsThisMonth: 0,
                    lastResetDate: now
                }, { transaction: t });
            }
        });

        const { sendPaymentSuccessEmail } = require('../utils/emailService');
        const tenant = bill.tenant;
        sendPaymentSuccessEmail(tenant, {
            billNumber: bill.billNumber,
            amount: parseFloat(bill.amount),
            currency: bill.currency
        }).catch(err => console.error('[Payment] Failed to send success email:', err.message));

        res.json({
            success: true,
            message: 'Payment successful. Your subscription is now active.',
            bill: {
                billNumber: bill.billNumber,
                amount: parseFloat(bill.amount),
                currency: bill.currency,
                paidAt: now
            }
        });
    } catch (error) {
        console.error('payBillByToken error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment failed. Please try again.'
        });
    }
};
