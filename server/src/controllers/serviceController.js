const db = require('../models');
const { parseLimitOffset, DEFAULT_MAX_PAGE_SIZE } = require('../utils/pagination');

/**
 * Get all services (paginated)
 */
const getServices = async (req, res) => {
    try {
        const { limit, offset, page } = parseLimitOffset(req, 20, DEFAULT_MAX_PAGE_SIZE);
        const { category, isActive } = req.query;

        const where = {};
        if (category) where.category = category;
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const { count, rows: services } = await db.Service.findAndCountAll({
            where,
            limit,
            offset
        });

        res.json({
            services,
            count: services.length,
            pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
        });
    } catch (error) {
        if (error.statusCode === 400) {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('Get services error:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Create a new service
 */
const createService = async (req, res) => {
    try {
        const service = await db.Service.create(req.body);
        res.status(201).json({ message: 'Service created', service });
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getServices,
    createService
};
