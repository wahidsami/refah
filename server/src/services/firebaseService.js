/**
 * Firebase Admin SDK Service
 * Handles sending push notifications to staff via Firebase Cloud Messaging (FCM).
 *
 * REQUIRED: Place your Firebase Service Account JSON at:
 *   server/firebase-service-account.json
 *
 * To generate:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 */

const path = require('path');
const fs = require('fs');

// Track initialization state
let firebaseAdmin = null;
let isInitialized = false;

/**
 * Initialize Firebase Admin SDK lazily (only when first used).
 * Returns true if successfully initialized, false otherwise.
 */
const initialize = () => {
    if (isInitialized) return true;

    const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');

    if (!fs.existsSync(serviceAccountPath)) {
        console.warn(
            '[Firebase] ⚠️  firebase-service-account.json not found at:',
            serviceAccountPath,
            '\n[Firebase] Push notifications will be SKIPPED until you add this file.',
            '\n[Firebase] See: Firebase Console → Project Settings → Service Accounts → Generate new private key'
        );
        return false;
    }

    try {
        const admin = require('firebase-admin');

        // Avoid re-initializing if already done (e.g., hot-reload in dev)
        if (admin.apps.length === 0) {
            const serviceAccount = require(serviceAccountPath);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('[Firebase] ✅ Firebase Admin SDK initialized successfully.');
        }

        firebaseAdmin = admin;
        isInitialized = true;
        return true;
    } catch (err) {
        console.error('[Firebase] ❌ Failed to initialize Firebase Admin SDK:', err.message);
        return false;
    }
};

/**
 * Send a push notification to a single device via FCM.
 *
 * @param {string} fcmToken  - The device's FCM registration token (stored in Staff.fcm_token)
 * @param {string} title     - Notification title (shown in the phone's notification bar)
 * @param {string} body      - Notification body text
 * @param {Object} data      - Optional key-value data payload (for deep linking, etc.)
 * @returns {Promise<boolean>} - true if sent, false if skipped or failed
 */
const sendToDevice = async (fcmToken, title, body, data = {}) => {
    if (!fcmToken) {
        console.warn('[Firebase] sendToDevice called with no FCM token — skipping.');
        return false;
    }

    if (!initialize()) {
        // Firebase not set up yet — gracefully skip without crashing anything
        return false;
    }

    // Stringify all data values (FCM requires string values for data payloads)
    const stringifiedData = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
    );

    const androidNotification = {
        title,
        body,
        sound: 'default',
        channelId: 'bookings',
        priority: 'max',
        defaultVibrateTimings: true,
        defaultSound: true,
    };
    const imageUrl = data.imageUrl || data.logoUrl;
    if (imageUrl) {
        androidNotification.image = imageUrl;
    }
    const message = {
        token: fcmToken,
        notification: { title, body },
        data: stringifiedData,
        android: {
            priority: 'high',
            notification: androidNotification,
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',   // iOS default alert sound
                    badge: 1,
                    'content-available': 1,
                },
            },
            headers: {
                'apns-priority': '10',  // iOS highest priority
            },
        },
    };

    try {
        const response = await firebaseAdmin.messaging().send(message);
        console.log(`[Firebase] ✅ Push notification sent. FCM Response: ${response}`);
        return true;
    } catch (err) {
        // Handle invalid/expired tokens gracefully (don't crash the booking)
        if (err.code === 'messaging/registration-token-not-registered') {
            console.warn(`[Firebase] ⚠️ FCM token is no longer valid (device unregistered). Token: ${fcmToken?.substring(0, 20)}...`);
        } else {
            console.error('[Firebase] ❌ Failed to send push notification:', err.message);
        }
        return false;
    }
};

/**
 * Notify a staff member about a new booking
 *
 * @param {string} fcmToken      - Staff's FCM token
 * @param {Object} appointment   - Appointment object with nested service and user
 */
const notifyNewBooking = async (fcmToken, appointment) => {
    const customerName = appointment.user
        ? `${appointment.user.firstName} ${appointment.user.lastName}`
        : 'A customer';

    const serviceName = appointment.service?.name_en || 'a service';

    const startTime = appointment.startTime
        ? new Date(appointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    const title = '📅 New Booking!';
    const body = `${customerName} booked ${serviceName}` + (startTime ? ` at ${startTime}` : '') + '.';

    return sendToDevice(fcmToken, title, body, {
        type: 'NEW_BOOKING',
        appointmentId: appointment.id || '',
        screen: 'Home',
    });
};

/**
 * Notify a staff member about a booking cancellation
 *
 * @param {string} fcmToken      - Staff's FCM token
 * @param {Object} appointment   - Appointment object with nested service and user
 */
const notifyBookingCancelled = async (fcmToken, appointment) => {
    const customerName = appointment.user
        ? `${appointment.user.firstName} ${appointment.user.lastName}`
        : 'A customer';

    const serviceName = appointment.service?.name_en || 'their appointment';

    const startTime = appointment.startTime
        ? new Date(appointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    const title = '❌ Booking Cancelled';
    const body = `${customerName} cancelled ${serviceName}` + (startTime ? ` at ${startTime}` : '') + '.';

    return sendToDevice(fcmToken, title, body, {
        type: 'BOOKING_CANCELLED',
        appointmentId: appointment.id || '',
        screen: 'Home',
    });
};

module.exports = {
    sendToDevice,
    notifyNewBooking,
    notifyBookingCancelled,
};
