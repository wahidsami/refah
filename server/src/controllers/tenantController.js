const db = require('../models');
const { Op } = require('sequelize');

/**
 * Get all active tenants (salons/spas) for browsing
 * GET /api/v1/tenants
 * Public endpoint - no auth required
 */
const getAllTenants = async (req, res) => {
    try {
        const { search, status, limit = 50, offset = 0 } = req.query;

        const where = {
            status: status || 'active' // Only show active tenants by default
        };

        // Search by name or slug
        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { slug: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const tenants = await db.Tenant.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['name', 'ASC']],
            attributes: [
                'id',
                'name',
                'slug',
                'plan',
                'status',
                'createdAt',
                'updatedAt'
            ]
        });

        res.json({
            success: true,
            tenants: tenants.rows,
            total: tenants.count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('Get tenants error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get tenant details by ID or slug
 * GET /api/v1/tenants/:idOrSlug
 * Public endpoint - no auth required
 */
const getTenantById = async (req, res) => {
    try {
        const { idOrSlug } = req.params;

        // Try to find by ID first, then by slug
        const tenant = await db.Tenant.findOne({
            where: {
                [Op.or]: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ],
                status: 'active'
            },
            attributes: [
                'id',
                'name',
                'slug',
                'plan',
                'status',
                'createdAt',
                'updatedAt'
            ]
        });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found or inactive'
            });
        }

        // Get tenant's services count
        const servicesCount = await db.Service.count({
            where: { isActive: true }
            // Note: In full multi-tenant, this would filter by tenant schema
        });

        // Get tenant's active staff count
        const staffCount = await db.Staff.count({
            where: { isActive: true }
            // Note: In full multi-tenant, this would filter by tenant schema
        });

        res.json({
            success: true,
            tenant: {
                ...tenant.toJSON(),
                servicesCount,
                staffCount
            }
        });

    } catch (error) {
        console.error('Get tenant error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get tenant's services
 * GET /api/v1/tenants/:idOrSlug/services
 * Public endpoint - no auth required
 */
const getTenantServices = async (req, res) => {
    try {
        const { idOrSlug } = req.params;

        // Verify tenant exists and is active
        const tenant = await db.Tenant.findOne({
            where: {
                [Op.or]: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ],
                status: 'active'
            }
        });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found or inactive'
            });
        }

        // Get services for this tenant only
        const services = await db.Service.findAll({
            where: { tenantId: tenant.id, isActive: true },
            order: [['category', 'ASC'], ['name_en', 'ASC']],
            attributes: [
                'id',
                'name_en',
                'name_ar',
                'description_en',
                'description_ar',
                'category',
                'duration',
                'basePrice',
                'minPrice',
                'maxPrice',
                'finalPrice',
                'image',
                'hasOffer',
                'offerDetails',
                'offerFrom',
                'offerTo',
                'hasGift',
                'giftType',
                'giftDetails'
            ]
        });

        const now = new Date();
        const today = now.toISOString().slice(0, 10); // YYYY-MM-DD for DATEONLY comparison
        const servicesWithOfferActive = services.map(s => {
            const json = s.toJSON ? s.toJSON() : s;
            let offerActive = false;
            if (json.hasOffer) {
                const fromOk = !json.offerFrom || json.offerFrom <= today;
                const toOk = !json.offerTo || json.offerTo >= today;
                offerActive = fromOk && toOk;
            }
            return { ...json, offerActive };
        });

        res.json({
            success: true,
            tenantId: tenant.id,
            tenantName: tenant.name,
            services: servicesWithOfferActive,
            count: servicesWithOfferActive.length
        });

    } catch (error) {
        console.error('Get tenant services error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get tenant's staff members
 * GET /api/v1/tenants/:idOrSlug/staff
 * Public endpoint - no auth required
 */
const getTenantStaff = async (req, res) => {
    try {
        const { idOrSlug } = req.params;

        // Verify tenant exists and is active
        const tenant = await db.Tenant.findOne({
            where: {
                [Op.or]: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ],
                status: 'active'
            }
        });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found or inactive'
            });
        }

        // Get active staff
        // Note: In full multi-tenant, this would query tenant's schema
        const staff = await db.Staff.findAll({
            where: { isActive: true },
            order: [['rating', 'DESC'], ['name', 'ASC']],
            attributes: [
                'id',
                'name',
                'email',
                'phone',
                'skills',
                'rating',
                'totalBookings',
                'isActive'
            ]
        });

        res.json({
            success: true,
            tenantId: tenant.id,
            tenantName: tenant.name,
            staff,
            count: staff.length
        });

    } catch (error) {
        console.error('Get tenant staff error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAllTenants,
    getTenantById,
    getTenantServices,
    getTenantStaff
};

