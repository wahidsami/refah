/**
 * Hot Deals Controller
 * Handles promotional deals creation, approval, and management
 */

const db = require('../models');
const promotionService = require('../services/promotionService');
const { getActiveSubscriptionForTenant } = require('../services/tenantSubscriptionService');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for hot deal image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/hot-deals';
        // Create directory if it doesn't exist
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'deal-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

/**
 * Get hot deals limits for current tenant
 * GET /api/v1/tenant/hot-deals/limits
 */
const getHotDealsLimits = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const result = await getActiveSubscriptionForTenant(tenantId, {
            statuses: ['active', 'trial', 'APPROVED_FREE_ACTIVE']
        });

        if (!result) {
            return res.json({
                success: true,
                canCreate: false,
                limits: {
                    packageName: 'Free',
                    maxHotDeals: 0,
                    autoApprove: false,
                    currentCount: 0
                }
            });
        }

        const packageLimits = result.package?.limits || {};
        const maxHotDeals = packageLimits.maxHotDeals || 0;
        const autoApprove = packageLimits.hotDealsAutoApprove ?? packageLimits.autoApproveHotDeals ?? false;

        const currentCount = await db.HotDeal.count({
            where: {
                tenantId,
                status: { [Op.in]: ['active', 'approved'] }
            }
        });

        const canCreate = maxHotDeals === -1 || currentCount < maxHotDeals;

        return res.json({
            success: true,
            canCreate,
            limits: {
                packageName: result.package?.name || 'Unknown',
                maxHotDeals,
                autoApprove,
                currentCount
            }
        });
    } catch (error) {
        console.error('Get hot deals limits error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch limits'
        });
    }
};

/**
 * Get all hot deals for a tenant
 * GET /api/v1/tenant/hot-deals
 */
const getTenantHotDeals = async (req, res) => {
    try {
        const tenantId = req.tenantId;

        const deals = await db.HotDeal.findAll({
            where: { tenantId },
            include: [{
                model: db.Service,
                as: 'service',
                attributes: ['id', 'name_en', 'name_ar', 'duration']
            }],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            deals
        });
    } catch (error) {
        console.error('Get tenant hot deals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch hot deals'
        });
    }
};

/**
 * Create a new hot deal
 * POST /api/v1/tenant/hot-deals
 */
const createHotDeal = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const {
            serviceId,
            title_en,
            title_ar,
            description_en,
            description_ar,
            discountType, // 'percentage' or 'fixed_amount'
            discountValue,
            validFrom,
            validUntil,
            maxRedemptions = -1
        } = req.body;

        // Check if tenant can create hot deals
        const canCreate = await promotionService.canCreateHotDeal(tenantId);

        if (!canCreate.allowed) {
            // Delete uploaded file if deal creation fails
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(403).json({
                success: false,
                message: canCreate.reason
            });
        }

        // Get service to calculate prices
        const service = await db.Service.findByPk(serviceId);
        if (!service) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        if (service.tenantId !== tenantId) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(403).json({
                success: false,
                message: 'You can only create deals for your own services'
            });
        }

        // Calculate discounted price (Service has finalPrice/rawPrice/basePrice, no .price)
        const originalPrice = parseFloat(service.finalPrice ?? service.rawPrice ?? service.basePrice ?? 0);
        let discountedPrice;

        if (discountType === 'percentage') {
            const discount = (originalPrice * discountValue) / 100;
            discountedPrice = originalPrice - discount;
        } else {
            discountedPrice = originalPrice - parseFloat(discountValue);
        }

        // Validate discount (max 50%)
        if (discountedPrice < originalPrice * 0.5) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'Maximum discount is 50%'
            });
        }

        // Validate dates
        if (new Date(validUntil) <= new Date(validFrom)) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'Valid until must be after valid from'
            });
        }

        // Create hot deal (auto-approved deals go live as 'active' so they appear in public API)
        const status = canCreate.autoApprove ? 'active' : 'pending';
        const imagePath = req.file ? `hot-deals/${req.file.filename}` : null;

        const deal = await db.HotDeal.create({
            tenantId,
            serviceId,
            title_en,
            title_ar,
            description_en,
            description_ar,
            discountType,
            discountValue,
            originalPrice,
            discountedPrice,
            validFrom,
            validUntil,
            maxRedemptions,
            status,
            isActive: true,
            image: imagePath
        });

        res.status(201).json({
            success: true,
            deal,
            autoApproved: canCreate.autoApprove
        });
    } catch (error) {
        console.error('Create hot deal error:', error);
        // Delete uploaded file if error occurs
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch (e) { console.error('Error deleting file:', e); }
        }
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create hot deal'
        });
    }
};

/**
 * Update a hot deal
 * PUT /api/v1/tenant/hot-deals/:id
 */
const updateHotDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const updates = req.body;

        const deal = await db.HotDeal.findByPk(id);
        if (!deal) {
            return res.status(404).json({
                success: false,
                message: 'Hot deal not found'
            });
        }

        if (deal.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        // Reject updates to active deals
        if (deal.status === 'active') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update active deals'
            });
        }

        await deal.update(updates);

        res.json({
            success: true,
            deal
        });
    } catch (error) {
        console.error('Update hot deal error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update hot deal'
        });
    }
};

/**
 * Delete a hot deal
 * DELETE /api/v1/tenant/hot-deals/:id
 */
const deleteHotDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const deal = await db.HotDeal.findByPk(id);
        if (!deal) {
            return res.status(404).json({
                success: false,
                message: 'Hot deal not found'
            });
        }

        if (deal.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        await deal.destroy();

        res.json({
            success: true,
            message: 'Hot deal deleted successfully'
        });
    } catch (error) {
        console.error('Delete hot deal error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete hot deal'
        });
    }
};

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * Get all hot deals pending approval
 * GET /api/v1/admin/hot-deals/pending
 */
const getPendingHotDeals = async (req, res) => {
    try {
        const deals = await db.HotDeal.findAll({
            where: { status: 'pending' },
            include: [
                {
                    model: db.Tenant,
                    as: 'tenant',
                    attributes: ['id', 'name_en', 'name_ar']
                },
                {
                    model: db.Service,
                    as: 'service',
                    attributes: ['id', 'name_en', 'name_ar', 'finalPrice', 'rawPrice', 'basePrice']
                }
            ],
            order: [['createdAt', 'ASC']]
        });

        res.json({
            success: true,
            deals
        });
    } catch (error) {
        console.error('Get pending hot deals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending hot deals'
        });
    }
};

/**
 * Approve a hot deal
 * POST /api/v1/admin/hot-deals/:id/approve
 */
const approveHotDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        const deal = await db.HotDeal.findByPk(id);
        if (!deal) {
            return res.status(404).json({
                success: false,
                message: 'Hot deal not found'
            });
        }

        if (deal.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Only pending deals can be approved'
            });
        }

        await deal.update({
            status: 'active',
            approvedBy: adminId,
            approvedAt: new Date()
        });

        res.json({
            success: true,
            deal
        });
    } catch (error) {
        console.error('Approve hot deal error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve hot deal'
        });
    }
};

/**
 * Reject a hot deal
 * POST /api/v1/admin/hot-deals/:id/reject
 */
const rejectHotDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const deal = await db.HotDeal.findByPk(id);
        if (!deal) {
            return res.status(404).json({
                success: false,
                message: 'Hot deal not found'
            });
        }

        if (deal.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Only pending deals can be rejected'
            });
        }

        await deal.update({
            status: 'rejected',
            rejectionReason: reason
        });

        res.json({
            success: true,
            deal
        });
    } catch (error) {
        console.error('Reject hot deal error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject hot deal'
        });
    }
};

// ============================================
// PUBLIC ENDPOINTS (for mobile app)
// ============================================

/**
 * Get all active hot deals
 * GET /api/v1/hot-deals
 */
const getActiveHotDeals = async (req, res) => {
    try {
        const now = new Date();

        const deals = await db.HotDeal.findAll({
            where: {
                status: 'active',
                isActive: true,
                validFrom: { [Op.lte]: now },
                validUntil: { [Op.gte]: now }
            },
            include: [
                {
                    model: db.Tenant,
                    as: 'tenant',
                    attributes: ['id', 'name_en', 'name_ar', 'logo', 'slug']
                },
                {
                    model: db.Service,
                    as: 'service',
                    attributes: ['id', 'name_en', 'name_ar', 'duration']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 20
        });

        res.json({
            success: true,
            deals
        });
    } catch (error) {
        console.error('Get active hot deals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch hot deals'
        });
    }
};

module.exports = {
    // Middleware
    upload,

    // Tenant endpoints
    getHotDealsLimits,
    getTenantHotDeals,
    createHotDeal,
    updateHotDeal,
    deleteHotDeal,

    // Admin endpoints
    getPendingHotDeals,
    approveHotDeal,
    rejectHotDeal,

    // Public endpoints
    getActiveHotDeals
};
