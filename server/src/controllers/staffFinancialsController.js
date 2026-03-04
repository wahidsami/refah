const db = require('../models');
const { Op } = require('sequelize');

/**
 * GET /me/earnings - Staff earnings summary
 */
exports.getEarnings = async (req, res) => {
    try {
        if (!req.permissions.view_earnings) {
            return res.status(403).json({ success: false, message: 'You do not have permission to view earnings' });
        }

        const staffId = req.staffId;

        const payrolls = await db.StaffPayroll.findAll({
            where: { staffId },
            order: [['periodStart', 'DESC']]
        });

        // Calculate overall totals
        const totals = payrolls.reduce((acc, p) => ({
            totalBase: acc.totalBase + parseFloat(p.baseSalary || 0),
            totalCommission: acc.totalCommission + parseFloat(p.commission || 0),
            totalTips: acc.totalTips + parseFloat(p.tipsTotal || 0),
            totalBonuses: acc.totalBonuses + parseFloat(p.bonuses || 0),
            totalDeductions: acc.totalDeductions + parseFloat(p.deductions || 0),
            totalNet: acc.totalNet + parseFloat(p.totalNet || 0),
        }), { totalBase: 0, totalCommission: 0, totalTips: 0, totalBonuses: 0, totalDeductions: 0, totalNet: 0 });

        res.status(200).json({
            success: true,
            data: {
                payrolls,
                totals,
                currentMonth: payrolls[0] || null
            }
        });
    } catch (error) {
        console.error('Error fetching earnings:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching earnings' });
    }
};

/**
 * GET /me/reviews - Staff's received customer reviews
 */
exports.getMyReviews = async (req, res) => {
    try {
        if (!req.permissions.view_reviews) {
            return res.status(403).json({ success: false, message: 'You do not have permission to view reviews' });
        }

        const staffId = req.staffId;

        const reviews = await db.Review.findAll({
            where: { staffId, isVisible: true },
            order: [['created_at', 'DESC']]
        });

        // Compute average rating
        const avgRating = reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
            : null;

        // Rating distribution (1–5 stars)
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach(r => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });

        res.status(200).json({
            success: true,
            data: { reviews, avgRating, distribution, total: reviews.length }
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching reviews' });
    }
};

/**
 * POST /me/reviews/:id/reply - Staff replies to a review
 */
exports.replyToReview = async (req, res) => {
    try {
        if (!req.permissions.reply_reviews) {
            return res.status(403).json({ success: false, message: 'You do not have permission to reply to reviews' });
        }

        const { id } = req.params;
        const staffId = req.staffId;
        const { reply } = req.body;

        if (!reply) {
            return res.status(400).json({ success: false, message: 'Reply text is required' });
        }

        const review = await db.Review.findOne({ where: { id, staffId } });
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        await review.update({
            staffReply: reply,
            staffRepliedAt: new Date()
        });

        res.status(200).json({ success: true, message: 'Reply posted', data: review });
    } catch (error) {
        console.error('Error replying to review:', error);
        res.status(500).json({ success: false, message: 'Server error while posting reply' });
    }
};
