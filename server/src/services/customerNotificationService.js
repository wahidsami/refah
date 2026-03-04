/**
 * Customer notification service
 * Sends push notifications to platform users (customers) via FCM.
 * Transactional notifications (booking confirmed, cancelled, review reply) do not count against tenant quota.
 */

const { Op } = require('sequelize');
const db = require('../models');
const firebaseService = require('./firebaseService');

/**
 * Persist a notification to the inbox (for in-app list).
 */
async function persistNotification(platformUserId, type, title, body, data = {}, tenantId = null) {
    try {
        await db.CustomerNotification.create({
            platformUserId,
            tenantId,
            type,
            title,
            body,
            data: data || {}
        });
    } catch (err) {
        console.error('[CustomerNotification] persist failed:', err.message);
    }
}

/**
 * Send push to a customer. Skips if no fcm_token or push disabled in preferences.
 * @param {string} platformUserId
 * @param {string} title
 * @param {string} body
 * @param {Object} data - optional key-value for deep linking (values will be stringified)
 * @returns {Promise<boolean>}
 */
async function sendToCustomer(platformUserId, title, body, data = {}) {
    if (!platformUserId) return false;
    const user = await db.PlatformUser.findByPk(platformUserId, {
        attributes: ['id', 'fcm_token', 'notificationPreferences']
    });
    if (!user || !user.fcm_token) return false;
    const prefs = user.notificationPreferences || {};
    if (prefs.push === false) return false;
    return firebaseService.sendToDevice(user.fcm_token, title, body, data);
}

/**
 * Notify customer that their booking was confirmed.
 * @param {Object} appointment - must have id, platformUserId, startTime, and include Tenant, Service
 */
async function notifyBookingConfirmed(appointment) {
    if (!appointment || !appointment.platformUserId) return false;
    const tenantName = appointment.tenant?.name_en || appointment.tenant?.name || 'the business';
    const serviceName = appointment.service?.name_en || appointment.service?.name_ar || 'your appointment';
    const dateStr = appointment.startTime
        ? new Date(appointment.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
    const title = 'Booking confirmed';
    const body = dateStr
        ? `Your booking at ${tenantName} for ${serviceName} on ${dateStr} is confirmed.`
        : `Your booking at ${tenantName} for ${serviceName} is confirmed.`;
    const data = { type: 'BOOKING_CONFIRMED', appointmentId: String(appointment.id), tenantId: appointment.tenantId ? String(appointment.tenantId) : '', screen: 'Booking' };
    const sent = await sendToCustomer(appointment.platformUserId, title, body, data);
    if (sent) await persistNotification(appointment.platformUserId, 'booking_confirmed', title, body, data, appointment.tenantId);
    return sent;
}

/**
 * Notify customer that their booking was cancelled.
 */
async function notifyBookingCancelled(appointment) {
    if (!appointment || !appointment.platformUserId) return false;
    const tenantName = appointment.tenant?.name_en || appointment.tenant?.name || 'the business';
    const dateStr = appointment.startTime
        ? new Date(appointment.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
        : '';
    const title = 'Booking cancelled';
    const body = dateStr
        ? `Your booking at ${tenantName} on ${dateStr} has been cancelled.`
        : `Your booking at ${tenantName} has been cancelled.`;
    const data = { type: 'BOOKING_CANCELLED', appointmentId: String(appointment.id), tenantId: appointment.tenantId ? String(appointment.tenantId) : '', screen: 'Bookings' };
    const sent = await sendToCustomer(appointment.platformUserId, title, body, data);
    if (sent) await persistNotification(appointment.platformUserId, 'booking_cancelled', title, body, data, appointment.tenantId);
    return sent;
}

/**
 * Notify customer that the business replied to their review.
 * @param {Object} review - must have platformUserId; include tenant for name
 */
async function notifyReviewReply(review) {
    if (!review || !review.platformUserId) return false;
    const tenantName = review.tenant?.name_en || review.tenant?.name || 'The business';
    const title = 'Reply to your review';
    const body = `${tenantName} replied to your review.`;
    const data = { type: 'REVIEW_REPLY', reviewId: String(review.id), tenantId: review.tenantId ? String(review.tenantId) : '', screen: 'Tenant' };
    const sent = await sendToCustomer(review.platformUserId, title, body, data);
    if (sent) await persistNotification(review.platformUserId, 'review_reply', title, body, data, review.tenantId);
    return sent;
}

/**
 * Notify customer that service is completed and remainder is due at the center.
 * Transactional (does not count against tenant marketing quota).
 * @param {Object} appointment - must have id, platformUserId, tenantId, remainderAmount (or remainderAmount computed)
 */
async function notifyServiceCompletedRemainderDue(appointment) {
    if (!appointment || !appointment.platformUserId) return false;
    const remainder = parseFloat(appointment.remainderAmount || 0);
    const title = 'Service completed';
    const body = remainder > 0
        ? `Please pay the remaining ${remainder.toFixed(2)} SAR at the cashier desk.`
        : 'Please complete payment at the cashier desk.';
    const data = {
        type: 'SERVICE_COMPLETED_REMAINDER_DUE',
        appointmentId: String(appointment.id),
        tenantId: appointment.tenantId ? String(appointment.tenantId) : '',
        remainderAmount: String(remainder),
        screen: 'Booking'
    };
    const sent = await sendToCustomer(appointment.platformUserId, title, body, data);
    if (sent) await persistNotification(appointment.platformUserId, 'service_completed_remainder_due', title, body, data, appointment.tenantId);
    return sent;
}

/**
 * Notify customer with a thank-you after service completion (no remainder due).
 * Transactional (does not count against tenant marketing quota).
 * @param {Object} appointment - must have id, platformUserId, tenantId
 */
async function notifyServiceCompletedThankYou(appointment) {
    if (!appointment || !appointment.platformUserId) return false;
    const title = 'Thank you for your visit';
    const body = 'We hope to see you again soon.';
    const data = {
        type: 'SERVICE_COMPLETED_THANK_YOU',
        appointmentId: String(appointment.id),
        tenantId: appointment.tenantId ? String(appointment.tenantId) : '',
        screen: 'Booking'
    };
    const sent = await sendToCustomer(appointment.platformUserId, title, body, data);
    if (sent) await persistNotification(appointment.platformUserId, 'service_completed_thank_you', title, body, data, appointment.tenantId);
    return sent;
}

/**
 * Send appointment reminder to customer (e.g. "Your appointment at X in 30 minutes").
 * Uses FCM with sound so the device can ring. Transactional.
 * @param {Object} appointment - must have id, platformUserId, startTime; include tenant, service
 * @param {number} minutesBefore - e.g. 30, 60, 120
 */
async function sendAppointmentReminder(appointment, minutesBefore) {
    if (!appointment || !appointment.platformUserId) return false;
    const tenantName = appointment.tenant?.name_en || appointment.tenant?.name || 'your appointment';
    const serviceName = appointment.service?.name_en || appointment.service?.name_ar || 'your service';
    const timeStr = appointment.startTime
        ? new Date(appointment.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : '';
    const title = 'Reminder: Appointment soon';
    const body = minutesBefore >= 60
        ? `Your appointment at ${tenantName} for ${serviceName} is in ${Math.floor(minutesBefore / 60)} hour(s).`
        : `Your appointment at ${tenantName} for ${serviceName} is in ${minutesBefore} minutes.` + (timeStr ? ` (${timeStr})` : '');
    const data = {
        type: 'APPOINTMENT_REMINDER',
        appointmentId: String(appointment.id),
        tenantId: appointment.tenantId ? String(appointment.tenantId) : '',
        screen: 'AppointmentDetail',
    };
    const sent = await sendToCustomer(appointment.platformUserId, title, body, data);
    if (sent) await persistNotification(appointment.platformUserId, 'appointment_reminder', title, body, data, appointment.tenantId);
    return sent;
}

/**
 * Get current month key YYYY-MM
 */
function getCurrentMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Send tenant-triggered marketing push to a list of customers. Counts against inAppMarketingNotifications limit.
 * @param {string} tenantId
 * @param {string[]} platformUserIds
 * @param {string} title
 * @param {string} body
 * @param {Object} data - optional for deep link
 * @returns {Promise<{ sent: number, limitReached?: boolean }>}
 */
async function sendTenantMarketingPush(tenantId, platformUserIds, title, body, data = {}) {
    const monthKey = getCurrentMonthKey();

    const activeStatuses = ['active', 'trial', 'APPROVED_FREE_ACTIVE'];
    let subscription = await db.TenantSubscription.findOne({
        where: { tenantId, status: { [Op.in]: activeStatuses } },
        include: [{ model: db.SubscriptionPackage, as: 'package' }]
    });
    if (!subscription) {
        const tenant = await db.Tenant.findByPk(tenantId, {
            include: [{
                model: db.TenantSubscription,
                as: 'subscription',
                where: { status: { [Op.in]: activeStatuses } },
                required: false,
                include: [{ model: db.SubscriptionPackage, as: 'package' }]
            }]
        });
        subscription = tenant?.subscription;
    }
    const limit = subscription?.package?.limits ? resolvePushLimit(subscription.package.limits) : 0;

    if (limit !== -1) {
        const [usage] = await db.TenantPushUsage.findOrCreate({
            where: { tenantId, month: monthKey },
            defaults: { tenantId, month: monthKey, count: 0 }
        });
        const requested = (platformUserIds || []).length;
        if (usage.count + requested > limit) {
            return { sent: 0, limitReached: true };
        }
    }

    // Load tenant for logo URL (and optional name) for notification display
    let logoUrl = (data && data.logoUrl) || '';
    if (!logoUrl) {
        const tenant = await db.Tenant.findByPk(tenantId, { attributes: ['logo', 'name_en', 'name_ar'] });
        if (tenant && tenant.logo) {
            const baseUrl = (process.env.BASE_URL || process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
            const path = tenant.logo.startsWith('/') ? tenant.logo : `/${tenant.logo}`;
            logoUrl = tenant.logo.startsWith('http') ? tenant.logo : `${baseUrl}${path}`;
        }
    }

    const payload = {
        type: 'MARKETING',
        tenantId: String(tenantId),
        screen: data.linkType === 'service' && data.serviceId ? 'ServiceDetail' : 'Tenant',
        linkType: data.linkType || 'tenant',
        ...data
    };
    if (logoUrl) payload.logoUrl = logoUrl;
    if (payload.linkType === 'service' && payload.serviceId) {
        payload.screen = 'ServiceDetail';
    }
    const sentToIds = [];
    for (const uid of (platformUserIds || [])) {
        const ok = await sendToCustomer(uid, title, body, payload);
        if (ok) {
            sentToIds.push(uid);
            await persistNotification(uid, 'marketing', title, body, payload, tenantId);
        }
    }
    const sent = sentToIds.length;

    if (limit !== -1 && sent > 0) {
        const [usage] = await db.TenantPushUsage.findOrCreate({
            where: { tenantId, month: monthKey },
            defaults: { tenantId, month: monthKey, count: 0 }
        });
        await usage.increment('count', { by: sent });
    }

    // Record campaign and recipients for history
    if (sent > 0 && db.TenantPushCampaign) {
        try {
            const campaign = await db.TenantPushCampaign.create({
                tenantId,
                title,
                body,
                data: payload,
                audienceType: data.audienceType || 'selected',
                recipientCount: sent,
                sentAt: new Date()
            });
            if (db.TenantPushCampaignRecipient && sentToIds.length > 0) {
                await db.TenantPushCampaignRecipient.bulkCreate(
                    sentToIds.map(platformUserId => ({ campaignId: campaign.id, platformUserId }))
                );
            }
        } catch (err) {
            console.error('[CustomerNotification] Failed to record push campaign:', err.message);
        }
    }

    return { sent };
}

/**
 * Resolve push limit from package limits (handles number, string, and pushNotifications flag).
 */
function resolvePushLimit(limits) {
    if (!limits || typeof limits !== 'object') return 0;
    const quota = limits.inAppMarketingNotifications;
    const num = typeof quota === 'number' ? quota : (typeof quota === 'string' ? parseInt(quota, 10) : NaN);
    if (!Number.isNaN(num)) return num;
    if (limits.pushNotifications === true) return -1; // feature on, no quota key → unlimited
    return 0;
}

/**
 * Get tenant's current month push usage and limit (for dashboard).
 * Fetches subscription directly by tenantId so RLS and includes don't hide the package.
 */
async function getTenantPushUsage(tenantId) {
    const monthKey = getCurrentMonthKey();
    try {
        const activeStatuses = ['active', 'trial', 'APPROVED_FREE_ACTIVE'];
        // 1) Prefer direct subscription lookup (avoids Tenant include + RLS quirks)
        let subscription = await db.TenantSubscription.findOne({
            where: { tenantId, status: { [Op.in]: activeStatuses } },
            include: [{ model: db.SubscriptionPackage, as: 'package' }]
        });
        if (!subscription) {
            // 2) Fallback: load via Tenant (original behavior)
            const tenant = await db.Tenant.findByPk(tenantId, {
                include: [{
                    model: db.TenantSubscription,
                    as: 'subscription',
                    where: { status: { [Op.in]: activeStatuses } },
                    required: false,
                    include: [{ model: db.SubscriptionPackage, as: 'package' }]
                }]
            });
            subscription = tenant?.subscription;
        }
        const limit = subscription?.package?.limits
            ? resolvePushLimit(subscription.package.limits)
            : 0;
        const usage = await db.TenantPushUsage.findOne({
            where: { tenantId, month: monthKey }
        });
        const count = usage ? Number(usage.count) : 0;
        return { count, limit, month: monthKey };
    } catch (err) {
        console.error('[CustomerNotification] getTenantPushUsage error:', err.message);
        return { count: 0, limit: 0, month: monthKey };
    }
}

module.exports = {
    sendToCustomer,
    notifyBookingConfirmed,
    notifyBookingCancelled,
    notifyReviewReply,
    notifyServiceCompletedRemainderDue,
    notifyServiceCompletedThankYou,
    sendAppointmentReminder,
    sendTenantMarketingPush,
    getTenantPushUsage,
    persistNotification
};
