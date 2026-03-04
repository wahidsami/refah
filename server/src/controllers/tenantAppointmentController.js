/**
 * Tenant Appointment Controller
 * Handles appointment management for authenticated tenants
 */

const db = require('../models');
const { Op } = require('sequelize');
const { Sequelize } = require('sequelize');
const { parseLimitOffset, DEFAULT_MAX_PAGE_SIZE } = require('../utils/pagination');
const bookingService = require('../services/bookingService');

/**
 * Get all appointments for the authenticated tenant
 * GET /api/v1/tenant/appointments
 */
exports.getAppointments = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { 
            startDate, 
            endDate, 
            staffId, 
            serviceId, 
            status,
            platformUserId
        } = req.query;

        const { limit, offset, page } = parseLimitOffset(req, 50, DEFAULT_MAX_PAGE_SIZE);
        const where = {};

        // Build date range filter (endDate = end of day so last-day appointments are included)
        if (startDate || endDate) {
            where.startTime = where.startTime || {};
            if (startDate) {
                where.startTime[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                // If endDate is date-only (no time), treat as end of day
                const endStr = String(endDate).trim();
                if (/^\d{4}-\d{2}-\d{2}$/.test(endStr) || (!endStr.includes('T') && !endStr.includes(' '))) {
                    end.setHours(23, 59, 59, 999);
                }
                where.startTime[Op.lte] = end;
            }
        }

        if (staffId) {
            where.staffId = staffId;
        }

        if (serviceId) {
            where.serviceId = serviceId;
        }

        if (status) {
            where.status = status;
        }

        if (platformUserId) {
            where.platformUserId = platformUserId;
        }

        // Get appointments with related data
        const { count, rows: appointments } = await db.Appointment.findAndCountAll({
            where,
            include: [
                {
                    model: db.Service,
                    as: 'service',
                    where: { tenantId }, // Ensure service belongs to tenant
                    attributes: ['id', 'name_en', 'name_ar', 'duration', 'category', 'image'],
                    required: true
                },
                {
                    model: db.Staff,
                    as: 'staff',
                    where: { tenantId }, // Ensure staff belongs to tenant
                    attributes: ['id', 'name', 'photo', 'phone', 'email'],
                    required: true
                },
                {
                    model: db.PlatformUser,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage'],
                    required: false
                }
            ],
            order: [['startTime', 'ASC']],
            limit,
            offset
        });

        res.json({
            success: true,
            appointments,
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
        console.error('Get appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments',
            error: error.message
        });
    }
};

/**
 * Get appointments for calendar view (grouped by date)
 * GET /api/v1/tenant/appointments/calendar
 */
exports.getCalendarAppointments = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { startDate, endDate, staffId } = req.query;

        const where = {};

        // Build date range filter (endDate = end of day so last-day appointments are included)
        if (startDate || endDate) {
            where.startTime = {};
            if (startDate) {
                where.startTime[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                const endStr = String(endDate).trim();
                if (/^\d{4}-\d{2}-\d{2}$/.test(endStr) || (!endStr.includes('T') && !endStr.includes(' '))) {
                    end.setHours(23, 59, 59, 999);
                }
                where.startTime[Op.lte] = end;
            }
        }

        if (staffId) {
            where.staffId = staffId;
        }

        const appointments = await db.Appointment.findAll({
            where,
            include: [
                {
                    model: db.Service,
                    as: 'service',
                    where: { tenantId },
                    attributes: ['id', 'name_en', 'name_ar', 'duration', 'category', 'image'],
                    required: true
                },
                {
                    model: db.Staff,
                    as: 'staff',
                    where: { tenantId },
                    attributes: ['id', 'name', 'photo'],
                    required: true
                },
                {
                    model: db.PlatformUser,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage'],
                    required: false
                }
            ],
            order: [['startTime', 'ASC']]
        });

        // Group appointments by date
        const groupedByDate = {};
        appointments.forEach(appointment => {
            const dateKey = appointment.startTime.toISOString().split('T')[0];
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(appointment);
        });

        res.json({
            success: true,
            appointments: groupedByDate,
            total: appointments.length
        });
    } catch (error) {
        console.error('Get calendar appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch calendar appointments',
            error: error.message
        });
    }
};

/**
 * Get a single appointment by ID
 * GET /api/v1/tenant/appointments/:id
 */
exports.getAppointment = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;

        const appointment = await db.Appointment.findOne({
            where: { id },
            include: [
                {
                    model: db.Service,
                    as: 'service',
                    where: { tenantId },
                    attributes: ['id', 'name_en', 'name_ar', 'description_en', 'description_ar', 'duration', 'category', 'image', 'rawPrice', 'taxRate', 'commissionRate', 'finalPrice'],
                    required: true
                },
                {
                    model: db.Staff,
                    as: 'staff',
                    where: { tenantId },
                    attributes: ['id', 'name', 'photo', 'phone', 'email', 'commissionRate'],
                    required: true
                },
                {
                    model: db.PlatformUser,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage'],
                    required: false
                }
            ]
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        res.json({
            success: true,
            appointment
        });
    } catch (error) {
        console.error('Get appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointment',
            error: error.message
        });
    }
};

/**
 * Reschedule an appointment (same 24h rule as customer)
 * PATCH /api/v1/tenant/appointments/:id/reschedule
 */
exports.rescheduleAppointment = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { startTime, staffId } = req.body || {};

        if (!startTime) {
            return res.status(400).json({
                success: false,
                message: 'startTime is required (ISO string)'
            });
        }

        const appointment = await bookingService.rescheduleAppointmentByTenant(id, tenantId, startTime, staffId || null);

        res.json({
            success: true,
            message: 'Appointment rescheduled successfully',
            appointment
        });
    } catch (error) {
        console.error('Reschedule appointment error:', error);
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
 * Update appointment status
 * PATCH /api/v1/tenant/appointments/:id/status
 */
exports.updateAppointmentStatus = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { status, notes } = req.body;

        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
        if (!validStatuses.includes(status)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const appointment = await db.Appointment.findOne({
            where: { id },
            include: [
                {
                    model: db.Service,
                    as: 'service',
                    where: { tenantId },
                    required: true
                }
            ],
            transaction
        });

        if (!appointment) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        appointment.status = status;
        if (notes !== undefined) {
            appointment.notes = notes;
        }

        await appointment.save({ transaction });
        await transaction.commit();

        res.json({
            success: true,
            message: 'Appointment status updated successfully',
            appointment
        });

        // Fire-and-forget: notify customer (transactional push)
        if (status === 'confirmed' || status === 'cancelled') {
            setImmediate(async () => {
                try {
                    const customerNotificationService = require('../services/customerNotificationService');
                    const full = await db.Appointment.findByPk(appointment.id, {
                        include: [
                            { model: db.Service, as: 'service', attributes: ['id', 'name_en', 'name'] },
                            { model: db.Tenant, as: 'tenant', attributes: ['id', 'name', 'name_en'] }
                        ]
                    });
                    if (full && full.platformUserId) {
                        if (status === 'confirmed') await customerNotificationService.notifyBookingConfirmed(full);
                        else if (status === 'cancelled') await customerNotificationService.notifyBookingCancelled(full);
                    }
                } catch (err) {
                    console.error('[TenantAppointment] Customer push notification failed:', err.message);
                }
            });
        }
        if (status === 'completed') {
            setImmediate(async () => {
                try {
                    const customerNotificationService = require('../services/customerNotificationService');
                    const firebaseService = require('../services/firebaseService');
                    const full = await db.Appointment.findByPk(appointment.id, {
                        attributes: ['id', 'platformUserId', 'tenantId', 'staffId', 'serviceId', 'paymentStatus', 'price', 'totalPaid', 'remainderAmount', 'depositPaid', 'remainderPaid']
                    });
                    if (full && full.platformUserId) {
                        const remainderDue = parseFloat(full.remainderAmount || 0);
                        const isRemainderDue = full.paymentStatus === 'deposit_paid' && remainderDue > 0;
                        if (isRemainderDue) {
                            await customerNotificationService.notifyServiceCompletedRemainderDue(full);
                        } else {
                            await customerNotificationService.notifyServiceCompletedThankYou(full);
                        }
                    }
                    // If tenant opted in: remind the assigned staff to collect remainder
                    const remainderDue = parseFloat(appointment.remainderAmount || 0);
                    const isRemainderDue = appointment.paymentStatus === 'deposit_paid' && remainderDue > 0;
                    if (isRemainderDue && appointment.staffId) {
                        const [settings] = await db.TenantSettings.findOrCreate({
                            where: { tenantId: appointment.tenantId },
                            defaults: { tenantId: appointment.tenantId }
                        });
                        const remind = (settings.notificationSettings && settings.notificationSettings.remindRemainderToCollect) !== false;
                        if (remind) {
                            const staff = await db.Staff.findByPk(appointment.staffId, { attributes: ['id', 'fcm_token'] });
                            if (staff && staff.fcm_token) {
                                const service = await db.Service.findByPk(appointment.serviceId, { attributes: ['name_en', 'name_ar'] });
                                let customerLabel = 'Customer';
                                if (appointment.platformUserId) {
                                    const user = await db.PlatformUser.findByPk(appointment.platformUserId, { attributes: ['firstName', 'lastName'] });
                                    if (user) customerLabel = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || customerLabel;
                                }
                                const serviceName = service ? (service.name_en || service.name_ar || 'Service') : 'Service';
                                const title = 'Reminder: collect remainder';
                                const body = `${customerLabel} — ${remainderDue.toFixed(2)} SAR remaining for ${serviceName}.`;
                                await firebaseService.sendToDevice(staff.fcm_token, title, body, {
                                    type: 'REMAINDER_TO_COLLECT',
                                    appointmentId: String(appointment.id),
                                    remainderAmount: String(remainderDue)
                                }).catch(() => {});
                            }
                        }
                    }
                } catch (err) {
                    console.error('[TenantAppointment] Customer/staff completion notification failed:', err.message);
                }
            });
        }
    } catch (error) {
        await transaction.rollback();
        console.error('Update appointment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update appointment status',
            error: error.message
        });
    }
};

/**
 * Update payment status
 * PATCH /api/v1/tenant/appointments/:id/payment
 */
exports.updatePaymentStatus = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { paymentStatus, paymentMethod } = req.body;

        const validPaymentStatuses = ['pending', 'deposit_paid', 'fully_paid', 'paid', 'refunded', 'partially_refunded'];
        if (!validPaymentStatuses.includes(paymentStatus)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Invalid payment status'
            });
        }

        const appointment = await db.Appointment.findOne({
            where: { id },
            include: [
                {
                    model: db.Service,
                    as: 'service',
                    where: { tenantId },
                    required: true
                }
            ],
            transaction
        });

        if (!appointment) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        const wasFullyPaid = appointment.paymentStatus === 'fully_paid' || appointment.paymentStatus === 'paid';
        const newFullyPaid = paymentStatus === 'fully_paid' || paymentStatus === 'paid';
        appointment.paymentStatus = paymentStatus === 'paid' ? 'fully_paid' : paymentStatus;
        if (paymentMethod) {
            appointment.paymentMethod = paymentMethod;
        }
        if (newFullyPaid) {
            appointment.paidAt = new Date();
            appointment.totalPaid = parseFloat(appointment.price || 0);
            appointment.depositPaid = true;
            appointment.remainderPaid = true;
        }

        await appointment.save({ transaction });

        // Record in transactions for admin financial dashboard (in-person payment - tenant marked as paid)
        if (newFullyPaid && !wasFullyPaid) {
            const existingTx = await db.Transaction.findOne({
                where: { appointmentId: appointment.id, type: 'booking', status: 'completed' },
                transaction
            });
            if (!existingTx) {
                const platformFee = parseFloat(appointment.platformFee || 0);
                const tenantRevenue = parseFloat(appointment.tenantRevenue || 0);
                const amount = parseFloat(appointment.price || 0);
                await db.Transaction.create({
                    platformUserId: appointment.platformUserId,
                    tenantId: appointment.tenantId,
                    appointmentId: appointment.id,
                    amount,
                    currency: 'SAR',
                    type: 'booking',
                    status: 'completed',
                    platformFee,
                    tenantRevenue,
                    metadata: { source: 'tenant_marked_paid', paymentMethod: paymentMethod || 'unknown' }
                }, { transaction });
            }
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'Payment status updated successfully',
            appointment
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Update payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment status',
            error: error.message
        });
    }
};

/**
 * Get appointment statistics
 * GET /api/v1/tenant/appointments/stats
 */
exports.getAppointmentStats = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { startDate, endDate } = req.query;

        const where = {};
        
        if (startDate || endDate) {
            where.startTime = {};
            if (startDate) {
                where.startTime[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                where.startTime[Op.lte] = new Date(endDate);
            }
        }

        // Get appointments with service filter
        const appointments = await db.Appointment.findAll({
            where,
            include: [
                {
                    model: db.Service,
                    as: 'service',
                    where: { tenantId },
                    attributes: ['id'],
                    required: true
                }
            ],
            attributes: ['id', 'status', 'paymentStatus', 'price', 'tenantRevenue', 'employeeCommission', 'startTime']
        });

        const stats = {
            total: appointments.length,
            byStatus: {
                pending: 0,
                confirmed: 0,
                completed: 0,
                cancelled: 0,
                no_show: 0
            },
            byPaymentStatus: {
                pending: 0,
                deposit_paid: 0,
                fully_paid: 0,
                paid: 0,
                refunded: 0,
                partially_refunded: 0
            },
            totalRevenue: 0,
            totalTenantRevenue: 0,
            totalEmployeeCommission: 0
        };

        appointments.forEach(appointment => {
            // Count by status
            if (stats.byStatus[appointment.status] !== undefined) {
                stats.byStatus[appointment.status]++;
            }

            // Count by payment status
            if (stats.byPaymentStatus[appointment.paymentStatus] !== undefined) {
                stats.byPaymentStatus[appointment.paymentStatus]++;
            }

            // Sum revenues
            if (appointment.price) {
                stats.totalRevenue += parseFloat(appointment.price);
            }
            if (appointment.tenantRevenue) {
                stats.totalTenantRevenue += parseFloat(appointment.tenantRevenue);
            }
            if (appointment.employeeCommission) {
                stats.totalEmployeeCommission += parseFloat(appointment.employeeCommission);
            }
        });

        // Round to 2 decimal places
        stats.totalRevenue = parseFloat(stats.totalRevenue.toFixed(2));
        stats.totalTenantRevenue = parseFloat(stats.totalTenantRevenue.toFixed(2));
        stats.totalEmployeeCommission = parseFloat(stats.totalEmployeeCommission.toFixed(2));

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get appointment stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointment statistics',
            error: error.message
        });
    }
};

