const db = require('../models');
const { Op } = require('sequelize');

/**
 * GET /tenant/reviews - Admin gets all reviews for their salon
 */
exports.getAllReviews = async (req, res) => {
    try {
        const tenantId = req.tenantId;

        const reviews = await db.Review.findAll({
            where: { tenantId },
            include: [{ model: db.Staff, as: 'staff', attributes: ['id', 'name'] }],
            order: [['createdAt', 'DESC']]
        });

        const avgRating = reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
            : null;

        res.status(200).json({ success: true, data: { reviews, avgRating, total: reviews.length } });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * PATCH /tenant/reviews/:id - Toggle visibility and/or set staff reply (public, like Google reviews)
 */
exports.updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const { isVisible, staffReply } = req.body;

        const review = await db.Review.findOne({ where: { id, tenantId } });
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        const updates = {};
        if (typeof isVisible === 'boolean') updates.isVisible = isVisible;
        if (staffReply !== undefined) {
            const trimmed = typeof staffReply === 'string' ? staffReply.trim() : '';
            updates.staffReply = trimmed || null;
            updates.staffRepliedAt = trimmed ? new Date() : null;
        }

        await review.update(updates);

        res.status(200).json({ success: true, data: review });

        // Fire-and-forget: notify customer when business replies to their review
        if (staffReply !== undefined && typeof staffReply === 'string' && staffReply.trim()) {
            setImmediate(async () => {
                try {
                    const customerNotificationService = require('../services/customerNotificationService');
                    const full = await db.Review.findByPk(review.id, {
                        include: [{ model: db.Tenant, as: 'tenant', attributes: ['id', 'name', 'name_en'] }]
                    });
                    if (full && full.platformUserId) {
                        await customerNotificationService.notifyReviewReply(full);
                    }
                } catch (err) {
                    console.error('[TenantPayroll] Review reply push notification failed:', err.message);
                }
            });
        }
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * GET /tenant/payroll - List all payroll records for this tenant
 */
exports.getPayrollRecords = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { month } = req.query; // e.g. '2026-02'

        const whereClause = { tenantId };
        if (month) {
            // Validate format: YYYY-MM
            if (!/^\d{4}-\d{2}$/.test(month)) {
                return res.status(400).json({ success: false, message: 'Invalid month format. Use YYYY-MM' });
            }
            whereClause.periodStart = `${month}-01`;
        }

        const records = await db.StaffPayroll.findAll({
            where: whereClause,
            include: [{ model: db.Staff, as: 'staff', attributes: ['id', 'name'] }],
            order: [['periodStart', 'DESC']]
        });

        res.status(200).json({ success: true, data: records });
    } catch (error) {
        console.error('Error fetching payroll:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * POST /tenant/payroll - Generate payroll record for a staff member
 */
exports.generatePayroll = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { staffId, periodStart, periodEnd, baseSalary, commission, tipsTotal, bonuses, deductions, notes } = req.body;

        if (!staffId || !periodStart || !periodEnd) {
            return res.status(400).json({ success: false, message: 'staffId, periodStart and periodEnd are required' });
        }

        // Upsert: update if exists for this period, else create
        const [payroll, created] = await db.StaffPayroll.findOrCreate({
            where: { staffId, tenantId, periodStart },
            defaults: { staffId, tenantId, periodStart, periodEnd, baseSalary: baseSalary || 0, commission: commission || 0, tipsTotal: tipsTotal || 0, bonuses: bonuses || 0, deductions: deductions || 0, notes, status: 'draft' }
        });

        if (!created) {
            await payroll.update({ periodEnd, baseSalary: baseSalary || 0, commission: commission || 0, tipsTotal: tipsTotal || 0, bonuses: bonuses || 0, deductions: deductions || 0, notes });
        }

        res.status(created ? 201 : 200).json({ success: true, data: payroll });
    } catch (error) {
        console.error('Error generating payroll:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * PATCH /tenant/payroll/:id/status - Mark payroll as processed or paid
 */
exports.updatePayrollStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const { status } = req.body;

        const validStatuses = ['draft', 'processed', 'paid'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
        }

        const payroll = await db.StaffPayroll.findOne({ where: { id, tenantId } });
        if (!payroll) {
            return res.status(404).json({ success: false, message: 'Payroll record not found' });
        }

        const updates = { status };
        if (status === 'paid') updates.paidAt = new Date();

        await payroll.update(updates);
        res.status(200).json({ success: true, data: payroll });
    } catch (error) {
        console.error('Error updating payroll status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
