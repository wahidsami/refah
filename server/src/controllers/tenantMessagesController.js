const db = require('../models');
const firebaseService = require('../services/firebaseService');

/**
 * Get all messages sent by this tenant
 */
exports.getMessages = async (req, res) => {
    try {
        const tenantId = req.tenantId;

        const messages = await db.StaffMessage.findAll({
            where: { tenantId, senderId: tenantId, senderType: 'admin' },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: messages
        });
    } catch (error) {
        console.error('Error fetching tenant messages:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching messages'
        });
    }
};

/**
 * Send a message to one or all staff members
 */
exports.sendMessage = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { recipientId, subject, body, isPinned } = req.body;

        if (!body) {
            return res.status(400).json({
                success: false,
                message: 'Message body is required'
            });
        }

        const message = await db.StaffMessage.create({
            tenantId,
            senderType: 'admin',
            senderId: tenantId, // Admin sends as the tenant
            recipientType: recipientId ? 'staff' : null,
            recipientId: recipientId || null, // null means broadcast to all
            subject,
            body,
            isPinned: isPinned || false,
            readBy: []
        });

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: message
        });

        // --- Push Notification (fire-and-forget, never blocks the response) ---
        setImmediate(async () => {
            try {
                const notifTitle = subject ? `💬 ${subject}` : '💬 New Message';
                const notifBody = body.length > 100 ? body.substring(0, 100) + '...' : body;

                if (recipientId) {
                    // Direct message — notify just the one staff member
                    const staff = await db.Staff.findByPk(recipientId, {
                        attributes: ['id', 'fcm_token']
                    });
                    if (staff && staff.fcm_token) {
                        await firebaseService.sendToDevice(staff.fcm_token, notifTitle, notifBody, {
                            type: 'NEW_MESSAGE',
                            messageId: message.id,
                            screen: 'Messages',
                        });
                    }
                } else {
                    // Broadcast — notify all staff with FCM tokens
                    const allStaff = await db.Staff.findAll({
                        where: { tenantId, isActive: true },
                        attributes: ['id', 'fcm_token']
                    });
                    const notifPromises = allStaff
                        .filter(s => s.fcm_token)
                        .map(s =>
                            firebaseService.sendToDevice(s.fcm_token, notifTitle, notifBody, {
                                type: 'NEW_MESSAGE',
                                messageId: message.id,
                                screen: 'Messages',
                            })
                        );
                    await Promise.allSettled(notifPromises);
                }
            } catch (notifError) {
                console.error('[TenantMessages] Failed to send push notification:', notifError.message);
            }
        });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while sending message'
        });
    }
};

/**
 * Delete a message sent by the admin
 */
exports.deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const deletedCount = await db.StaffMessage.destroy({
            where: { id, tenantId }
        });

        if (deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting message'
        });
    }
};
