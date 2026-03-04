/**
 * Tenant bills (My Bills) — authenticated
 * GET /api/v1/tenant/bills: list bills for the current tenant
 */

const db = require('../models');

exports.getBills = async (req, res) => {
    try {
        const { tenantId } = req;

        const bills = await db.Bill.findAll({
            where: { tenantId },
            order: [['createdAt', 'DESC']],
            include: [
                { model: db.TenantSubscription, as: 'subscription', include: [{ model: db.SubscriptionPackage, as: 'package', attributes: ['name', 'name_ar'] }] }
            ]
        });

        const list = bills.map((b) => ({
            id: b.id,
            billNumber: b.billNumber,
            amount: parseFloat(b.amount),
            currency: b.currency,
            dueDate: b.dueDate,
            status: b.status,
            paidAt: b.paidAt,
            planSnapshot: b.planSnapshot,
            type: b.type,
            paymentToken: b.status === 'UNPAID' ? b.paymentToken : undefined
        }));

        res.json({ success: true, bills: list });
    } catch (error) {
        console.error('getBills error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load bills'
        });
    }
};
