const db = require('../models');
const { Op } = require('sequelize');

/**
 * Helper to get all dates within a range that match a specific day of week
 * @param {Date} start 
 * @param {Date} end 
 * @param {number} dayOfWeek (0-6, 0=Sunday)
 */
const getDatesForDayOfWeek = (start, end, dayOfWeek) => {
    const dates = [];
    let current = new Date(start);

    // Find first occurrence of the day
    while (current.getDay() !== dayOfWeek && current <= end) {
        current.setDate(current.getDate() + 1);
    }

    // Add all occurrences
    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 7);
    }
    return dates;
};

/**
 * Get staff schedule (shifts + time off) for a given date range
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
exports.getSchedule = async (req, res) => {
    try {
        const staffId = req.staffId;
        const tenantId = req.tenantId;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate query parameters are required'
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Ensure end handles the full day
        end.setHours(23, 59, 59, 999);

        // 1. Fetch recurring shifts that are active
        // NOTE: Two [Op.or] keys in the same object is ILLEGAL in JS — the second
        // silently overwrites the first. We combine them under [Op.and] instead.
        const recurringShifts = await db.StaffShift.findAll({
            where: {
                staffId,
                isRecurring: true,
                isActive: true,
                [Op.and]: [
                    { [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: start } }] },
                    { [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: end } }] }
                ]
            }
        });

        // 2. Fetch specific-date overrides/shifts within the window
        const specificShifts = await db.StaffShift.findAll({
            where: {
                staffId,
                isRecurring: false,
                isActive: true,
                specificDate: {
                    [Op.between]: [start, end]
                }
            }
        });

        // Calculate actual occurrences for recurring shifts
        const populatedShifts = [];

        recurringShifts.forEach(shift => {
            // Find valid boundary for this specific recurring rule
            const effectiveStart = shift.startDate && new Date(shift.startDate) > start ? new Date(shift.startDate) : start;
            const effectiveEnd = shift.endDate && new Date(shift.endDate) < end ? new Date(shift.endDate) : end;

            const dates = getDatesForDayOfWeek(effectiveStart, effectiveEnd, shift.dayOfWeek);

            dates.forEach(date => {
                populatedShifts.push({
                    id: shift.id + '-' + date.getTime(), // Synthetic instance ID for frontend rendering
                    shiftId: shift.id,
                    date: date.toISOString().split('T')[0],
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    label: shift.label,
                    type: 'shift'
                });
            });
        });

        specificShifts.forEach(shift => {
            populatedShifts.push({
                id: shift.id,
                date: shift.specificDate,
                startTime: shift.startTime,
                endTime: shift.endTime,
                label: shift.label,
                type: 'specific'
            });
        });

        // 3. Fetch Time Off overlapping this window
        const timeOffs = await db.StaffTimeOff.findAll({
            where: {
                staffId,
                [Op.or]: [
                    {
                        startDate: { [Op.between]: [start, end] }
                    },
                    {
                        endDate: { [Op.between]: [start, end] }
                    },
                    {
                        startDate: { [Op.lte]: start },
                        endDate: { [Op.gte]: end }
                    }
                ]
            },
            order: [['startDate', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: {
                shifts: populatedShifts.sort((a, b) => new Date(a.date) - new Date(b.date)),
                timeOff: timeOffs
            }
        });

    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching schedule'
        });
    }
};

/**
 * Get all time off requests for the staff member
 */
exports.getTimeOffRequests = async (req, res) => {
    try {
        const timeOffs = await db.StaffTimeOff.findAll({
            where: { staffId: req.staffId },
            order: [['startDate', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: timeOffs
        });
    } catch (error) {
        console.error('Error fetching time off requests:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching time off requests'
        });
    }
};

/**
 * Submit a new time off request
 */
exports.submitTimeOffRequest = async (req, res) => {
    try {
        const { startDate, endDate, type, reason } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required'
            });
        }

        const timeOff = await db.StaffTimeOff.create({
            staffId: req.staffId,
            startDate,
            endDate,
            type: type || 'vacation',
            reason,
            isApproved: false // Admin must approve
        });

        res.status(201).json({
            success: true,
            message: 'Time off request submitted successfully',
            data: timeOff
        });
    } catch (error) {
        console.error('Error submitting time off:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while submitting time off request'
        });
    }
};

/**
 * Cancel a pending time off request
 */
exports.cancelTimeOffRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const timeOff = await db.StaffTimeOff.findOne({
            where: { id, staffId: req.staffId }
        });

        if (!timeOff) {
            return res.status(404).json({
                success: false,
                message: 'Time off request not found'
            });
        }

        if (timeOff.isApproved) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel an already approved time off request. Please contact your admin.'
            });
        }

        await timeOff.destroy();

        res.status(200).json({
            success: true,
            message: 'Time off request cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling time off:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while cancelling time off request'
        });
    }
};
