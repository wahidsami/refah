const bookingService = require('../services/bookingService');
const db = require('../models');
const { Op } = require('sequelize');
const firebaseService = require('../services/firebaseService');

/**
 * Search for available slots
 * POST /api/v1/bookings/search
 * Public endpoint - tenantId required in request body
 */
const searchAvailability = async (req, res) => {
    const startTotal = Date.now();
    try {
        const { serviceId, staffId, date, tenantId } = req.body;

        if (!serviceId || !date) {
            return res.status(400).json({
                success: false,
                message: 'serviceId and date are required'
            });
        }

        // tenantId is optional for now (for backward compatibility)
        // In production, this should be required or come from context
        const finalTenantId = tenantId || req.tenantId;

        if (!finalTenantId) {
            return res.status(400).json({
                success: false,
                message: 'tenantId is required'
            });
        }

        // Use new AvailabilityService
        const availabilityService = require('../services/availabilityService');
        const result = await availabilityService.getAvailableSlots(finalTenantId, {
            serviceId,
            staffId: staffId || null, // null = any staff
            date
        });

        const totalMs = Date.now() - startTotal;
        if (process.env.AVAILABILITY_TIMING_LOG === '1' || process.env.NODE_ENV !== 'production') {
            console.log(JSON.stringify({
                event: 'availability_search',
                totalMs,
                requestId: req.requestId || null,
                tenantId: finalTenantId,
                serviceId,
                staffId: staffId || null,
                date,
                slotsCount: result.slots.length,
                availableSlots: result.metadata?.availableSlots ?? 0,
                staffCount: result.metadata?.staffCount ?? (staffId ? 1 : 0),
                ...(result._timings && { timings: result._timings })
            }));
        }

        res.json({
            success: true,
            slots: result.slots,
            date,
            totalSlots: result.slots.length,
            availableSlots: result.metadata.availableSlots,
            metadata: result.metadata
        });

    } catch (error) {
        console.error('Search availability error:', error);

        let statusCode = 500;
        if (error.message.includes('required') || error.message.includes('not found')) {
            statusCode = 400;
        }

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get staff recommendations with AI scoring
 * GET /api/v1/bookings/recommendations
 * Optional auth - better recommendations if logged in
 */
const getRecommendations = async (req, res) => {
    try {
        const { serviceId, preferredTime } = req.query;
        const platformUserId = req.userId || null; // From optional auth

        if (!serviceId) {
            return res.status(400).json({ message: 'serviceId is required' });
        }

        const recommendations = await bookingService.getStaffRecommendations(
            platformUserId,
            serviceId,
            preferredTime ? new Date(preferredTime) : new Date()
        );

        res.json({
            recommendations,
            count: recommendations.length
        });

    } catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Create a new booking
 * POST /api/v1/bookings/create
 * Requires authentication - uses platformUserId from JWT
 * Uses unified BookingService
 */
const createBooking = async (req, res) => {
    try {
        const { serviceId, staffId, startTime, tenantId, paymentIntent } = req.body;
        const platformUserId = req.userId; // From auth middleware

        // Validation
        if (!serviceId || !startTime) {
            return res.status(400).json({
                success: false,
                message: 'serviceId and startTime are required. staffId is optional (for "Any Staff" selection).'
            });
        }

        // Get tenantId from request body or use default
        let finalTenantId = tenantId || req.tenantId;

        // If no tenantId provided, try to get from service
        if (!finalTenantId) {
            const service = await db.Service.findByPk(serviceId);
            if (service && service.tenantId) {
                finalTenantId = service.tenantId;
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'tenantId is required. Please specify which salon you are booking at.'
                });
            }
        }

        // Enforce maxBookingsPerMonth limit
        const { checkResourceLimit } = require('../utils/tenantLimitsUtil');
        const { Op } = require('sequelize');
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const limitCheck = await checkResourceLimit(finalTenantId, 'maxBookingsPerMonth', async () => {
            return await db.Appointment.count({
                where: {
                    tenantId: finalTenantId,
                    createdAt: { [Op.gte]: startOfMonth }
                }
            });
        });

        if (!limitCheck.allowed) {
            return res.status(403).json({
                success: false,
                message: `This salon has reached its monthly booking limit on the ${limitCheck.packageName} plan.`
            });
        }

        // Use unified booking service
        // staffId is optional - if not provided, system will auto-assign best available staff
        const appointment = await bookingService.createBooking({
            serviceId,
            staffId: staffId || null, // null = "Any Staff"
            platformUserId,
            tenantId: finalTenantId,
            startTime,
            paymentIntent: paymentIntent || 'full' // 'full' | 'deposit'
        });

        // Load related data with platform user
        const fullAppointment = await db.Appointment.findByPk(appointment.id, {
            include: [
                { model: db.Service, as: 'service' },
                { model: db.Staff, as: 'staff' },
                {
                    model: db.PlatformUser,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            appointment: fullAppointment
        });

        // --- Push Notification (fire-and-forget, never blocks the response) ---
        // Fetch the assigned staff member's FCM token and notify them of the new booking.
        // We do this AFTER the response is sent so the customer gets instant confirmation.
        setImmediate(async () => {
            try {
                if (fullAppointment && fullAppointment.staffId) {
                    const staff = await db.Staff.findByPk(fullAppointment.staffId, {
                        attributes: ['id', 'fcm_token']
                    });
                    if (staff && staff.fcm_token) {
                        await firebaseService.notifyNewBooking(staff.fcm_token, fullAppointment);
                    }
                }
            } catch (notifError) {
                console.error('[BookingController] Failed to send new booking push notification:', notifError.message);
            }
        });

    } catch (error) {
        console.error('Create booking error:', error);

        let statusCode = 500;
        let message = error.message;
        if (error.code === 'REDIS_UNAVAILABLE') {
            statusCode = 503;
            message = 'Booking service temporarily unavailable. Please try again shortly.';
        } else if (error.code === 'SLOT_BUSY' || error.code === 'SLOT_ALREADY_TAKEN') {
            statusCode = 409;
            message = error.message || 'Time slot already taken.';
        } else if (error.message.includes('required') || error.message.includes('not found')) {
            statusCode = 400;
        } else if (error.message.includes('conflict') || error.message.includes('not available')) {
            statusCode = 409;
        } else if (error.message.includes('inactive') || error.message.includes('banned')) {
            statusCode = 403;
        }

        res.status(statusCode).json({
            success: false,
            message
        });
    }
};

/**
 * Get booking details
 * GET /api/v1/bookings/:id
 * Optional auth - returns more details if user owns the booking
 */
const getBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const platformUserId = req.userId; // Optional from optionalAuth

        const appointment = await db.Appointment.findByPk(id, {
            include: [
                { model: db.Service, as: 'service' },
                { model: db.Staff, as: 'staff' },
                { model: db.Tenant, as: 'tenant', required: false },
                {
                    model: db.PlatformUser,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
                },
                { model: db.AppointmentReminder, as: 'reminder', required: false },
                // Keep legacy customer for backward compatibility
                {
                    model: db.Customer,
                    as: 'legacyCustomer',
                    required: false
                }
            ]
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // If user is authenticated and owns the booking, return full details
        // Otherwise, return limited details
        if (platformUserId && appointment.platformUserId === platformUserId) {
            res.json({
                success: true,
                appointment
            });
        } else {
            // Return limited details for non-owners
            const limitedAppointment = {
                id: appointment.id,
                service: appointment.Service,
                staff: appointment.Staff,
                startTime: appointment.startTime,
                endTime: appointment.endTime,
                status: appointment.status,
                price: appointment.price
            };
            res.json({
                success: true,
                appointment: limitedAppointment
            });
        }

    } catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Cancel a booking
 * PATCH /api/v1/bookings/:id/cancel
 * Requires authentication - users can only cancel their own bookings
 */
const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const platformUserId = req.userId; // From auth middleware

        const result = await bookingService.cancelAppointment(id, platformUserId);
        const { appointment, refundAmount, feeRetained } = result;

        const payload = {
            success: true,
            message: 'Booking cancelled successfully',
            appointment
        };
        if (refundAmount != null) payload.refundAmount = refundAmount;
        if (feeRetained != null) payload.feeRetained = feeRetained;
        res.json(payload);

        // --- Push Notification (fire-and-forget) ---
        // Notify the assigned staff member that the booking was cancelled.
        setImmediate(async () => {
            try {
                if (appointment && appointment.staffId) {
                    const staff = await db.Staff.findByPk(appointment.staffId, {
                        attributes: ['id', 'fcm_token']
                    });
                    if (staff && staff.fcm_token) {
                        await firebaseService.notifyBookingCancelled(staff.fcm_token, appointment);
                    }
                }
            } catch (notifError) {
                console.error('[BookingController] Failed to send cancellation push notification:', notifError.message);
            }
        });

    } catch (error) {
        console.error('Cancel booking error:', error);
        const statusCode = error.message.includes('Unauthorized') ? 403 :
            error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Reschedule a booking
 * PATCH /api/v1/bookings/:id/reschedule
 * Requires authentication - users can only reschedule their own bookings
 */
const rescheduleBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const platformUserId = req.userId;
        const { startTime, staffId } = req.body || {};

        if (!startTime) {
            return res.status(400).json({
                success: false,
                message: 'startTime is required (ISO string)'
            });
        }

        const appointment = await bookingService.rescheduleAppointment(id, platformUserId, startTime, staffId || null);

        res.json({
            success: true,
            message: 'Booking rescheduled successfully',
            appointment
        });
    } catch (error) {
        console.error('Reschedule booking error:', error);
        const statusCode = error.message.includes('Unauthorized') ? 403 :
            error.message.includes('not found') ? 404 :
            error.message.includes('Invalid') || error.message.includes('only allowed') || error.message.includes('must be') || error.message.includes('cannot be') ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Set or clear reminder for a booking
 * PATCH /api/v1/bookings/:id/reminder
 * Body: { notify: boolean, minutesBefore?: number } (e.g. 30, 60, 120)
 */
const updateBookingReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const platformUserId = req.userId;
        const { notify, minutesBefore = 30 } = req.body || {};

        const appointment = await db.Appointment.findByPk(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        if (appointment.platformUserId !== platformUserId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        if (!['confirmed', 'pending'].includes(appointment.status)) {
            return res.status(400).json({ success: false, message: 'Reminder only for confirmed or pending appointments' });
        }

        if (notify) {
            const mins = Math.min(1440, Math.max(5, parseInt(minutesBefore, 10) || 30));
            const [reminder] = await db.AppointmentReminder.findOrCreate({
                where: { appointmentId: id },
                defaults: {
                    platformUserId,
                    reminderMinutesBefore: mins,
                    sentAt: null,
                },
            });
            await reminder.update({ reminderMinutesBefore: mins, sentAt: null });
            return res.json({
                success: true,
                reminder: { minutesBefore: mins },
                message: `Reminder set for ${mins} minutes before appointment`,
            });
        }
        const reminder = await db.AppointmentReminder.findOne({ where: { appointmentId: id } });
        if (reminder) await reminder.destroy();
        return res.json({ success: true, reminder: null, message: 'Reminder removed' });
    } catch (error) {
        console.error('Update booking reminder error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * List all bookings (with filters)
 * GET /api/v1/bookings
 * If authenticated, returns user's bookings. Otherwise, requires filters.
 */
const listBookings = async (req, res) => {
    try {
        const { parseLimitOffset, DEFAULT_MAX_PAGE_SIZE } = require('../utils/pagination');
        const { limit, offset, page } = parseLimitOffset(req, 20, DEFAULT_MAX_PAGE_SIZE);

        const { staffId, platformUserId, status, startDate, endDate, tenantId } = req.query;
        const authenticatedUserId = req.userId; // From optional auth

        const where = {};

        // If user is authenticated, default to their bookings
        if (authenticatedUserId) {
            where.platformUserId = authenticatedUserId;
        } else if (platformUserId) {
            where.platformUserId = platformUserId;
        }

        if (req.query.customerId) {
            where.customerId = req.query.customerId;
        }

        if (staffId) where.staffId = staffId;
        if (status) {
            if (status === 'upcoming') {
                where.status = ['confirmed', 'pending'];
                where.startTime = { [Op.gte]: new Date() };
            } else if (status === 'history') {
                where.status = ['completed', 'cancelled', 'no_show'];
            } else {
                where.status = status;
            }
        }

        if (startDate || endDate) {
            where.startTime = {};
            if (startDate) where.startTime[Op.gte] = new Date(startDate);
            if (endDate) where.startTime[Op.lte] = new Date(endDate);
        }

        const { count, rows: appointments } = await db.Appointment.findAndCountAll({
            where,
            include: [
                { model: db.Service, as: 'service' },
                { model: db.Staff, as: 'staff' },
                {
                    model: db.PlatformUser,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
                    required: false
                },
                {
                    model: db.Customer,
                    as: 'legacyCustomer',
                    required: false
                }
            ],
            order: [['startTime', 'DESC']],
            limit,
            offset
        });

        res.json({
            success: true,
            appointments,
            count: appointments.length,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });

    } catch (error) {
        if (error.statusCode === 400) {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('List bookings error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get next available slot for a service and staff
 * GET /api/v1/bookings/next-available
 * Query params: tenantId, serviceId, staffId, daysToSearch (optional, 1-60, capped by NEXT_AVAILABLE_MAX_DAYS)
 */
const getNextAvailableSlot = async (req, res) => {
    try {
        const { tenantId, serviceId, staffId, daysToSearch } = req.query;

        if (!tenantId || !serviceId || !staffId) {
            return res.status(400).json({
                success: false,
                message: 'tenantId, serviceId, and staffId are required'
            });
        }

        if (daysToSearch !== undefined && daysToSearch !== '') {
            const requested = parseInt(daysToSearch, 10);
            if (Number.isNaN(requested) || requested < 1 || requested > 60) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid daysToSearch (must be an integer between 1 and 60)'
                });
            }
        }

        const rawMax = parseInt(process.env.NEXT_AVAILABLE_MAX_DAYS || '14', 10);
        const maxDays = Math.min(60, Math.max(1, Number.isNaN(rawMax) ? 14 : rawMax));
        const requested = daysToSearch ? parseInt(daysToSearch, 10) : 14;
        const daysToSearchCapped = Number.isNaN(requested) ? 14 : Math.min(Math.max(1, requested), maxDays);

        const availabilityService = require('../services/availabilityService');
        const result = await availabilityService.getNextAvailableSlot(tenantId, {
            serviceId,
            staffId,
            daysToSearch: daysToSearchCapped
        });

        res.json(result);

    } catch (error) {
        if (process.env.NODE_ENV !== 'test') {
            console.error('Get next available slot error:', error);
        }
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to find next available slot'
        });
    }
};

module.exports = {
    searchAvailability,
    getRecommendations,
    createBooking,
    getBooking,
    cancelBooking,
    rescheduleBooking,
    updateBookingReminder,
    listBookings,
    getNextAvailableSlot
};
