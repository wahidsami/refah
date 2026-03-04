const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../models');
const { Op } = require('sequelize');
const emailService = require('../utils/emailService');

// Helper to generate tokens
const generateTokens = (staff) => {
    const accessToken = jwt.sign(
        {
            sub: staff.id,
            tenantId: staff.tenantId,
            role: 'staff'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' } // 1 day for access token
    );

    const refreshToken = jwt.sign(
        {
            sub: staff.id,
            tenantId: staff.tenantId,
            role: 'staff',
            purpose: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' } // 30 days for refresh token
    );

    return { accessToken, refreshToken };
};

/**
 * Login Staff
 */
const login = async (req, res) => {
    try {
        const email = (req.body.email || '').toString().trim().toLowerCase();
        const password = (req.body.password || '').toString().trim();

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        // Find staff by email
        const staff = await db.Staff.findOne({
            where: { email },
            include: [
                {
                    model: db.Tenant,
                    as: 'tenant',
                    attributes: ['id', 'name_en', 'name_ar', 'logo', 'status']
                },
                {
                    model: db.StaffPermission,
                    as: 'permissions'
                }
            ]
        });

        if (!staff) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!staff.password_hash) {
            return res.status(401).json({ success: false, message: 'Your account has not been set up for app access.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, staff.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Validation checks
        if (!staff.app_enabled) {
            return res.status(403).json({ success: false, message: 'App access disabled. Please contact your salon admin.' });
        }

        if (!staff.isActive) {
            return res.status(403).json({ success: false, message: 'Staff account inactive. Please contact your salon admin.' });
        }

        if (staff.tenant && staff.tenant.status === 'rejected') {
            return res.status(403).json({ success: false, message: 'Salon account has been rejected. Please contact support.' });
        }

        // Generate tokens
        const tokens = generateTokens(staff);

        // Update last login
        staff.last_login = new Date();
        await staff.save();

        res.json({
            success: true,
            message: 'Login successful',
            tokens,
            user: {
                id: staff.id,
                name: staff.name,
                email: staff.email,
                photo: staff.photo,
                must_change_password: staff.must_change_password,
                tenant: staff.tenant,
                permissions: staff.permissions
            }
        });
    } catch (error) {
        console.error('[StaffAuthController.login]', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Refresh Token
 */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token required' });
        }

        // Verify token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        if (decoded.role !== 'staff' || decoded.purpose !== 'refresh') {
            return res.status(401).json({ success: false, message: 'Invalid refresh token format' });
        }

        // Check if staff exists and active
        const staff = await db.Staff.findByPk(decoded.sub);

        if (!staff || !staff.isActive || !staff.app_enabled) {
            return res.status(401).json({ success: false, message: 'Account disabled or missing' });
        }

        // Generate new tokens
        const tokens = generateTokens(staff);

        res.json({
            success: true,
            message: 'Token refreshed',
            tokens
        });
    } catch (error) {
        console.error('[StaffAuthController.refreshToken]', error);
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
};

/**
 * Logout
 */
const logout = async (req, res) => {
    try {
        const staff = await db.Staff.findByPk(req.staffId);
        if (staff) {
            // Clear FCM token on logout to stop push notifications
            staff.fcm_token = null;
            await staff.save();
        }
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('[StaffAuthController.logout]', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Force change password (first login usually)
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
        }

        const staff = await db.Staff.findByPk(req.staffId);

        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }

        // If must change password flag is not clear, we don't strictly require currentPassword (for convenience of first login), 
        // but if they provide it, we verify. Or we can just allow it since they have the valid JWT.
        if (!staff.must_change_password && currentPassword) {
            const isMatch = await bcrypt.compare(currentPassword, staff.password_hash);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Incorrect current password' });
            }
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        staff.password_hash = await bcrypt.hash(newPassword, salt);
        staff.must_change_password = false;
        await staff.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('[StaffAuthController.changePassword]', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Request Password Reset (Forgot Password)
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const staff = await db.Staff.findOne({ where: { email: email.toLowerCase() } });

        // Don't reveal if email exists, just return success
        if (!staff || !staff.app_enabled) {
            return res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
        }

        // Generate token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Save to DB (hash it for security)
        const salt = await bcrypt.genSalt(10);
        staff.password_reset_token = await bcrypt.hash(resetToken, salt);
        staff.password_reset_expires = new Date(Date.now() + 3600000); // 1 hour
        await staff.save();

        // App Deep Link (same pattern as customer app; scheme rifahstaff)
        const resetUrl = `rifahstaff://reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

        // Send email via template (same pattern as customer: Resend + template, no enumeration on failure)
        try {
            await emailService.sendStaffPasswordResetEmail({
                to: staff.email,
                userName: staff.name || 'Staff',
                resetLink: resetUrl,
                expiryMinutes: 60
            });
        } catch (sendErr) {
            console.error('[StaffAuthController.forgotPassword] Send email failed:', sendErr);
            // Same generic response so we don't reveal whether the email exists
        }

        res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
    } catch (error) {
        console.error('[StaffAuthController.forgotPassword]', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Execute Password Reset
 */
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { email, newPassword } = req.body;

        if (!token || !email || !newPassword || newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'Invalid data provided. Password must be at least 8 chars.' });
        }

        const staff = await db.Staff.findOne({
            where: {
                email: email.toLowerCase(),
                password_reset_token: { [Op.not]: null },
                password_reset_expires: { [Op.gt]: new Date() }
            }
        });

        if (!staff) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        // Verify token
        const isValidToken = await bcrypt.compare(token, staff.password_reset_token);
        if (!isValidToken) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        staff.password_hash = await bcrypt.hash(newPassword, salt);
        staff.must_change_password = false;
        staff.password_reset_token = null;
        staff.password_reset_expires = null;
        await staff.save();

        res.json({ success: true, message: 'Password reset successful. You can now log in.' });
    } catch (error) {
        console.error('[StaffAuthController.resetPassword]', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Register FCM Token for push notifications
 */
const registerFcmToken = async (req, res) => {
    try {
        const { fcm_token } = req.body;

        if (!fcm_token) {
            return res.status(400).json({ success: false, message: 'FCM token required' });
        }

        const staff = await db.Staff.findByPk(req.staffId);
        staff.fcm_token = fcm_token;
        await staff.save();

        res.json({ success: true, message: 'Push notification token registered' });
    } catch (error) {
        console.error('[StaffAuthController.registerFcmToken]', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Get Staff Profile (Me)
 */
const getMe = async (req, res) => {
    try {
        const staff = await db.Staff.findByPk(req.staffId, {
            attributes: ['id', 'name', 'email', 'phone', 'photo', 'nationality', 'bio', 'must_change_password'],
            include: [
                {
                    model: db.Tenant,
                    as: 'tenant',
                    attributes: ['id', 'name_en', 'name_ar', 'logo', 'status']
                },
                {
                    model: db.StaffPermission,
                    as: 'permissions'
                }
            ]
        });

        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }

        res.json({
            success: true,
            user: staff
        });
    } catch (error) {
        console.error('[StaffAuthController.getMe]', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    login,
    refreshToken,
    logout,
    changePassword,
    forgotPassword,
    resetPassword,
    registerFcmToken,
    getMe
};
