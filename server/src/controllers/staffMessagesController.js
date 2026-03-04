const db = require('../models');
const { Op } = require('sequelize');

/**
 * Get all messages for the logged-in staff member.
 * Includes broadcasts (recipientId === null) and direct messages.
 */
exports.getMessages = async (req, res) => {
    try {
        const staffId = req.staffId;
        const tenantId = req.tenantId;

        const messages = await db.StaffMessage.findAll({
            where: {
                tenantId,
                [Op.or]: [
                    { recipientId: staffId },
                    { recipientId: null } // Broadcasts
                ]
            },
            order: [
                ['isPinned', 'DESC'],
                ['createdAt', 'DESC']
            ]
        });

        res.status(200).json({
            success: true,
            data: messages
        });
    } catch (error) {
        console.error('Error fetching staff messages:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching messages'
        });
    }
};

/**
 * Mark a message as read by appending the staffId to the readBy array
 */
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const staffId = req.staffId;
        const tenantId = req.tenantId;

        const message = await db.StaffMessage.findOne({
            where: {
                id,
                tenantId,
                [Op.or]: [
                    { recipientId: staffId },
                    { recipientId: null }
                ]
            }
        });

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Check if already read
        const currentReadBy = Array.isArray(message.readBy) ? message.readBy : [];
        if (!currentReadBy.includes(staffId)) {
            currentReadBy.push(staffId);

            // We use .update() to ensure the JSONB array is fully written
            await db.StaffMessage.update(
                { readBy: currentReadBy },
                { where: { id: message.id } }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Message marked as read'
        });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating message status'
        });
    }
};

/**
 * Register the device FCM token for push notifications
 */
exports.registerFcmToken = async (req, res) => {
    try {
        const staffId = req.staffId;
        if (!staffId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { fcmToken } = req.body;

        if (!fcmToken) {
            return res.status(400).json({
                success: false,
                message: 'fcmToken is required'
            });
        }

        // staffAuth columns are attached directly to the Staff table now
        await db.Staff.update(
            { fcm_token: fcmToken },
            { where: { id: staffId } }
        );

        res.status(200).json({
            success: true,
            message: 'Push notification token registered successfully'
        });
    } catch (error) {
        console.error('Error registering FCM token:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while registering token'
        });
    }
};
