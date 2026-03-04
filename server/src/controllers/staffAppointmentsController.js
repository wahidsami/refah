const db = require('../models');
const { Op } = require('sequelize');

/**
 * Get staff's appointments for today
 */
exports.getTodayAppointments = async (req, res) => {
    try {
        const staffId = req.staffId;
        const tenantId = req.tenantId;

        // Start and end of today using a non-mutating approach.
        // Using setHours() on a shared Date object mutates it in place, which
        // causes subtle bugs. We create separate Date objects for clarity.
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const appointments = await db.Appointment.findAll({
            where: {
                tenantId,
                staffId,
                startTime: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            },
            include: [
                {
                    model: db.PlatformUser,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo']
                },
                {
                    model: db.Service,
                    as: 'service',
                    attributes: ['id', 'name_en', 'name_ar', 'duration', 'finalPrice', 'basePrice']
                }
            ],
            order: [['startTime', 'ASC']]
        });

        // Obscure customer notes if staff does not have 'view_clients' permission
        const responseData = req.permissions && req.permissions.view_clients
            ? appointments
            : appointments.map(appt => {
                const plainAppt = appt.get({ plain: true });
                plainAppt.customerNotes = null;
                return plainAppt;
            });

        res.status(200).json({
            success: true,
            count: responseData.length,
            data: responseData
        });
    } catch (error) {
        console.error('Error fetching today appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching appointments',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Update appointment status (Start, Complete, No-Show, etc.)
 */
exports.updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const staffId = req.staffId;
        const tenantId = req.tenantId;

        // Valid statuses that staff are allowed to set
        const validStatuses = ['started', 'completed', 'no-show'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const appointment = await db.Appointment.findOne({
            where: { id, tenantId, staffId }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or does not belong to you'
            });
        }

        // Optional: Add logic to prevent changing from 'completed' back to 'pending', etc.
        if (appointment.status === 'completed' || appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: `Cannot change status of a ${appointment.status} appointment`
            });
        }

        // Map frontend "no-show" to DB "no_show"
        appointment.status = status === 'no-show' ? 'no_show' : status;

        // If completed, maybe record the end time differently? For now, we trust the duration.
        await appointment.save();

        // Notify customer when service is marked completed (transactional push + inbox)
        if (status === 'completed') {
            setImmediate(async () => {
                try {
                    const customerNotificationService = require('../services/customerNotificationService');
                    const firebaseService = require('../services/firebaseService');
                    const full = await db.Appointment.findByPk(appointment.id, {
                        attributes: ['id', 'platformUserId', 'tenantId', 'staffId', 'paymentStatus', 'price', 'totalPaid', 'remainderAmount', 'depositPaid', 'remainderPaid']
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
                    // If tenant opted in: remind the staff who marked it done to collect remainder
                    const remainderDue = parseFloat(appointment.remainderAmount || 0);
                    const isRemainderDue = appointment.paymentStatus === 'deposit_paid' && remainderDue > 0;
                    if (isRemainderDue) {
                        const [settings] = await db.TenantSettings.findOrCreate({
                            where: { tenantId: appointment.tenantId },
                            defaults: { tenantId: appointment.tenantId }
                        });
                        const remind = (settings.notificationSettings && settings.notificationSettings.remindRemainderToCollect) !== false;
                        if (remind) {
                            const staff = await db.Staff.findByPk(appointment.staffId, { attributes: ['id', 'name', 'fcm_token'] });
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
                    console.error('[StaffAppointments] Customer/staff notification on completed failed:', err.message);
                }
            });
        }

        res.status(200).json({
            success: true,
            message: `Appointment marked as ${status}`,
            data: appointment
        });

    } catch (error) {
        console.error('Error updating appointment status:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating appointment',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
