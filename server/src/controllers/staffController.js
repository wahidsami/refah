const db = require('../models');
const { parseLimitOffset, DEFAULT_MAX_PAGE_SIZE } = require('../utils/pagination');

/**
 * Get all staff members (paginated)
 */
const getStaff = async (req, res) => {
    try {
        const { limit, offset, page } = parseLimitOffset(req, 20, DEFAULT_MAX_PAGE_SIZE);
        const { isActive } = req.query;

        const where = {};
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const { count, rows: staff } = await db.Staff.findAndCountAll({
            where,
            include: [{ model: db.Service, as: 'services' }],
            limit,
            offset
        });

        res.json({
            staff,
            count: staff.length,
            pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
        });
    } catch (error) {
        if (error.statusCode === 400) {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('Get staff error:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Create a new staff member
 */
const createStaff = async (req, res) => {
    try {
        const staff = await db.Staff.create(req.body);
        res.status(201).json({ message: 'Staff created', staff });
    } catch (error) {
        console.error('Create staff error:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get staff availability for a specific date
 */
const getStaffAvailability = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ message: 'date parameter is required' });
        }

        const dayOfWeek = new Date(date).getDay();

        const schedule = await db.StaffSchedule.findAll({
            where: {
                staffId,
                dayOfWeek,
                isAvailable: true
            }
        });

        res.json({ schedule });
    } catch (error) {
        console.error('Get staff availability error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getStaff,
    createStaff,
    getStaffAvailability
};
