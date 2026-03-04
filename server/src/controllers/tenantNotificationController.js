const db = require('../models');
const { Op } = require('sequelize');
const customerNotificationService = require('../services/customerNotificationService');
const { parseLimitOffset, DEFAULT_MAX_PAGE_SIZE } = require('../utils/pagination');

/**
 * Get current month push usage and limit for the tenant
 * GET /api/v1/tenant/notifications/usage
 */
exports.getPushUsage = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.tenant?.id;
        if (!tenantId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const usage = await customerNotificationService.getTenantPushUsage(tenantId);
        return res.json({ success: true, data: usage });
    } catch (error) {
        console.error('Get push usage error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Send marketing push to selected customers. Counts against inAppMarketingNotifications.
 * POST /api/v1/tenant/notifications/send
 * Body: { platformUserIds: string[], title: string, body: string }
 * Or body: { audience: 'all_booked', title, body } to send to all customers who have booked with this tenant (optional).
 */
exports.sendMarketingPush = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.tenant?.id;
        if (!tenantId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const { platformUserIds, audience, title, body, linkType, serviceId } = req.body;

        if (!title || typeof title !== 'string' || !body || typeof body !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'title and body are required'
            });
        }

        const pushData = { linkType: linkType || 'tenant', audienceType: audience === 'all_booked' ? 'all_booked' : 'selected' };
        if (serviceId && (linkType === 'service' || !linkType)) {
            const service = await db.Service.findOne({
                where: { id: serviceId, tenantId, isActive: true },
                attributes: ['id', 'hasOffer', 'offerDetails', 'hasGift', 'giftType', 'giftDetails']
            });
            if (!service) {
                return res.status(400).json({
                    success: false,
                    message: 'Service not found or does not belong to your tenant'
                });
            }
            pushData.linkType = 'service';
            pushData.serviceId = String(service.id);
            pushData.hasGift = service.hasGift ? 'true' : 'false';
            pushData.giftSummary = (service.hasGift && service.giftDetails) ? String(service.giftDetails).slice(0, 200) : '';
        }

        let userIds = Array.isArray(platformUserIds) ? platformUserIds : [];

        if (userIds.length === 0 && audience === 'all_booked') {
            // Get customers who have made appointments OR orders with this tenant
            const appointmentUserIds = await db.Appointment.findAll({
                where: { tenantId, platformUserId: { [Op.ne]: null } },
                attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('platformUserId')), 'platformUserId']],
                raw: true
            });
            
            const orderUserIds = await db.Order.findAll({
                where: { tenantId },
                attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('platformUserId')), 'platformUserId']],
                raw: true
            });

            // Merge and deduplicate
            const userIdSet = new Set([
                ...appointmentUserIds.map(a => a.platformUserId).filter(Boolean),
                ...orderUserIds.map(o => o.platformUserId).filter(Boolean)
            ]);
            userIds = [...userIdSet];
        }

        if (userIds.length === 0) {
            return res.json({
                success: true,
                message: 'No customers to send to',
                data: { sent: 0 }
            });
        }

        const result = await customerNotificationService.sendTenantMarketingPush(
            tenantId,
            userIds,
            title.trim(),
            body.trim(),
            pushData
        );

        if (result.limitReached) {
            return res.status(403).json({
                success: false,
                message: 'Monthly push limit reached. Upgrade your plan for more.'
            });
        }

        res.json({
            success: true,
            message: `Push sent to ${result.sent} customer(s)`,
            data: { sent: result.sent }
        });
    } catch (error) {
        console.error('Send marketing push error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get push notification send history (paginated)
 * GET /api/v1/tenant/notifications/history
 */
exports.getPushHistory = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.tenant?.id;
        if (!tenantId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const { limit, offset, page } = parseLimitOffset(req, 20, Math.min(DEFAULT_MAX_PAGE_SIZE, 100));

        const { count, rows: campaigns } = await db.TenantPushCampaign.findAndCountAll({
            where: { tenantId },
            order: [['sentAt', 'DESC']],
            limit,
            offset,
            attributes: ['id', 'title', 'body', 'data', 'audienceType', 'recipientCount', 'sentAt']
        });

        const list = campaigns.map(c => {
            const d = c.toJSON();
            d.bodyTruncated = d.body ? (d.body.length > 120 ? d.body.slice(0, 120) + '…' : d.body) : '';
            return d;
        });

        res.json({
            success: true,
            campaigns: list,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get push history error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get one campaign detail
 * GET /api/v1/tenant/notifications/history/:id
 */
exports.getPushHistoryDetail = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.tenant?.id;
        const { id } = req.params;
        if (!tenantId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const campaign = await db.TenantPushCampaign.findOne({
            where: { id, tenantId },
            attributes: ['id', 'title', 'body', 'data', 'audienceType', 'recipientCount', 'sentAt']
        });
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }
        res.json({ success: true, campaign: campaign.toJSON() });
    } catch (error) {
        console.error('Get push history detail error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get recipients for a campaign (for "to whom")
 * GET /api/v1/tenant/notifications/history/:id/recipients
 */
exports.getPushHistoryRecipients = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.tenant?.id;
        const { id } = req.params;
        if (!tenantId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const campaign = await db.TenantPushCampaign.findOne({
            where: { id, tenantId },
            attributes: ['id']
        });
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const recipients = await db.TenantPushCampaignRecipient.findAll({
            where: { campaignId: campaign.id },
            include: [{
                model: db.PlatformUser,
                as: 'platformUser',
                attributes: ['id', 'email', 'firstName', 'lastName'],
                required: false
            }],
            order: [['createdAt', 'ASC']]
        });

        const list = recipients.map(r => {
            const u = r.platformUser;
            return {
                platformUserId: r.platformUserId,
                email: u?.email || null,
                firstName: u?.firstName || null,
                lastName: u?.lastName || null
            };
        });

        res.json({ success: true, recipients: list });
    } catch (error) {
        console.error('Get push history recipients error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
