/**
 * Appointment reminder cron: send "notify me" reminders to customers.
 * Run every 10 minutes. Finds reminders due in the next window and sends FCM (with sound).
 */

const db = require('../models');
const { Op } = require('sequelize');
const customerNotificationService = require('../services/customerNotificationService');

const WINDOW_MINUTES = 10; // Send if appointment is in [minutesBefore - 10, minutesBefore + 10] from now

async function run() {
    const now = new Date();
    const reminders = await db.AppointmentReminder.findAll({
        where: { sentAt: null },
        include: [
            {
                model: db.Appointment,
                as: 'appointment',
                required: true,
                where: {
                    status: { [Op.in]: ['confirmed', 'pending'] },
                    startTime: { [Op.gt]: now },
                },
                include: [
                    { model: db.Service, as: 'service' },
                    { model: db.Tenant, as: 'tenant' },
                ],
            },
        ],
    });

    let sent = 0;
    for (const rem of reminders) {
        const appointment = rem.appointment;
        if (!appointment) continue;
        const start = new Date(appointment.startTime);
        const minutesUntil = (start - now) / (60 * 1000);
        const mins = rem.reminderMinutesBefore || 30;
        if (minutesUntil <= mins + WINDOW_MINUTES && minutesUntil >= mins - WINDOW_MINUTES) {
            try {
                const ok = await customerNotificationService.sendAppointmentReminder(appointment, mins);
                if (ok) {
                    await rem.update({ sentAt: new Date() });
                    sent++;
                }
            } catch (err) {
                console.error('[ReminderCron] Send failed for appointment', appointment.id, err.message);
            }
        }
    }
    if (sent > 0) {
        console.log(`[ReminderCron] Sent ${sent} appointment reminder(s).`);
    }
    return sent;
}

module.exports = { run };
