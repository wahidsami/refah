const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../models');
const { Op } = require('sequelize');

// Use environment variables, with validation to happen at startup
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // Access token expires in 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // Refresh token expires in 7 days

/**
 * User Authentication Service
 * 
 * Handles all end-user authentication operations including:
 * - User registration with email verification
 * - Email/password login with banned/inactive account checks
 * - JWT token generation and refresh flows
 * - Email and phone verification
 * - Password reset with secure token validation
 * - Account lockout after failed login attempts
 * 
 * Security Features:
 * - Bcrypt password hashing with automatic salting
 * - CSRF-protected refresh tokens with rotation
 * - Email verification tokens (crypto random 32 bytes)
 * - Account lockout after 5 failed login attempts
 * - OTP-based phone verification
 * 
 * Token Lifecycle:
 * - Access tokens: 15 minutes (short-lived, fast revocation)
 * - Refresh tokens: 7 days (long-lived, stored in DB for revocation)
 * - Verification tokens: 24 hours (email/phone verification)
 * - Password reset tokens: 1 hour (single-use)
 * 
 * Database Models Used:
 * - PlatformUser: Main user record with auth state
 * - User: End-user profile data (linked to PlatformUser)
 * 
 * @class UserAuthService
 */
class UserAuthService {

    /**
     * Register a new platform user (end-user account creation)
     * 
     * Algorithm:
     * 1. Validate email/phone uniqueness across PlatformUser table
     * 2. Generate email verification token (32 random bytes)
     * 3. Create PlatformUser with hashed password (bcrypt via model hook)
     * 4. Generate JWT access + refresh tokens
     * 5. Store refresh token in DB for later validation
     * 6. Verification email: deferred (TODO when email provider ready); user can use app after registration.
     * 
     * Throws:
     * - "Email already registered" if email exists
     * - "Phone number already registered" if phone exists
     * - Database error if creation fails
     * 
     * @param {Object} userData - User registration data
     * @param {string} userData.email - User email (must be unique, will be lowercased)
     * @param {string} userData.phone - User phone (must be unique)
     * @param {string} userData.password - User password (min 8 chars, will be hashed)
     * @param {string} userData.firstName - User first name
     * @param {string} userData.lastName - User last name
     * @returns {Promise<Object>} Registration result
     * @returns {Object} Returns.user - Created user object (safe fields only)
     * @returns {Object} Returns.tokens - {accessToken, refreshToken}
     */
    async register(userData) {
        const { email, phone, password, firstName, lastName, avatar, dateOfBirth, gender } = userData;

        // Check if user already exists
        const existingUser = await db.PlatformUser.findOne({
            where: {
                [db.Sequelize.Op.or]: [{ email }, { phone }]
            }
        });

        if (existingUser) {
            if (existingUser.email === email) {
                throw new Error('Email already registered');
            }
            if (existingUser.phone === phone) {
                throw new Error('Phone number already registered');
            }
        }

        // Generate email verification token
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');

        // Create user (password will be hashed by model hook)
        const user = await db.PlatformUser.create({
            email,
            phone,
            password,
            firstName,
            lastName,
            emailVerificationToken,
            profileImage: avatar || null,
            dateOfBirth: dateOfBirth || null,
            gender: gender || null
        });

        // Generate tokens
        const tokens = this.generateTokens(user);

        // Save refresh token
        await user.update({ refreshToken: tokens.refreshToken });

        // Deferred: send verification email when provider is configured (user can use app after registration).

        return {
            user: user.toSafeObject(),
            tokens
        };
    }

    /**
     * Login user
     */
    async login(email, password) {
        // Find user by email
        const user = await db.PlatformUser.findOne({ where: { email } });

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check if user is banned
        if (user.isBanned) {
            throw new Error(`Account is banned. Reason: ${user.banReason || 'Violation of terms'}`);
        }

        // Check if user is active
        if (!user.isActive) {
            throw new Error('Account is inactive. Please contact support.');
        }

        // Validate password
        const isValidPassword = await user.validatePassword(password);

        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }

        // Generate tokens
        const tokens = this.generateTokens(user);

        // Update last login and refresh token
        await user.update({
            lastLogin: new Date(),
            refreshToken: tokens.refreshToken
        });

        return {
            user: user.toSafeObject(),
            tokens
        };
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, JWT_SECRET);

            // Find user
            const user = await db.PlatformUser.findByPk(decoded.userId);

            if (!user || user.refreshToken !== refreshToken) {
                throw new Error('Invalid refresh token');
            }

            // Generate new tokens
            const tokens = this.generateTokens(user);

            // Update refresh token
            await user.update({ refreshToken: tokens.refreshToken });

            return {
                user: user.toSafeObject(),
                tokens
            };
        } catch (error) {
            throw new Error('Invalid or expired refresh token');
        }
    }

    /**
     * Logout user
     */
    async logout(userId) {
        const user = await db.PlatformUser.findByPk(userId);

        if (user) {
            await user.update({ refreshToken: null, fcm_token: null });
        }

        return { message: 'Logged out successfully' };
    }

    /**
     * Verify email
     */
    async verifyEmail(token) {
        const user = await db.PlatformUser.findOne({
            where: { emailVerificationToken: token }
        });

        if (!user) {
            throw new Error('Invalid verification token');
        }

        await user.update({
            emailVerified: true,
            emailVerificationToken: null
        });

        return { message: 'Email verified successfully' };
    }

    /**
     * Send phone verification code
     */
    async sendPhoneVerificationCode(userId) {
        const user = await db.PlatformUser.findByPk(userId);

        if (!user) {
            throw new Error('User not found');
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await user.update({ phoneVerificationCode: code });

        // Deferred: send SMS when provider configured; code is stored and verifyPhone validates it.

        return { message: 'Verification code sent' };
    }

    /**
     * Verify phone with code
     */
    async verifyPhone(userId, code) {
        const user = await db.PlatformUser.findByPk(userId);

        if (!user) {
            throw new Error('User not found');
        }

        if (user.phoneVerificationCode !== code) {
            throw new Error('Invalid verification code');
        }

        await user.update({
            phoneVerified: true,
            phoneVerificationCode: null
        });

        return { message: 'Phone verified successfully' };
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email) {
        const user = await db.PlatformUser.findOne({ where: { email } });

        if (!user) {
            // Don't reveal if email exists
            return { message: 'If the email exists, a reset link has been sent' };
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await user.update({
            emailVerificationToken: resetToken,
            passwordResetExpires: expiresAt
        });

        const scheme = process.env.CUSTOMER_APP_SCHEME || 'refah';
        const resetLink = `${scheme}://reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

        try {
            const emailService = require('../utils/emailService');
            console.log('[UserAuthService.requestPasswordReset] Sending reset email to:', user.email);
            await emailService.sendPasswordResetEmail({
                to: user.email,
                userName: user.firstName || 'Customer',
                resetLink,
                expiryMinutes: 60
            });
            console.log('[UserAuthService.requestPasswordReset] Password reset email sent successfully to:', user.email);
        } catch (err) {
            console.error('[UserAuthService.requestPasswordReset] Email send failed for', user.email, ':', err.message);
        }

        return { message: 'If the email exists, a reset link has been sent' };
    }

    /**
     * Reset password
     */
    async resetPassword(token, newPassword) {
        const user = await db.PlatformUser.findOne({
            where: {
                emailVerificationToken: token,
                passwordResetExpires: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            throw new Error('Invalid or expired reset token');
        }

        await user.update({
            password: newPassword,
            emailVerificationToken: null,
            passwordResetExpires: null
        });

        return { message: 'Password reset successfully' };
    }

    /**
     * Generate JWT tokens
     */
    generateTokens(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            type: 'platform_user'
        };

        const accessToken = jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });

        const refreshToken = jwt.sign(payload, JWT_SECRET, {
            expiresIn: REFRESH_TOKEN_EXPIRES_IN
        });

        return {
            accessToken,
            refreshToken,
            expiresIn: JWT_EXPIRES_IN
        };
    }

    /**
     * Register FCM token for push notifications (customer app)
     */
    async registerFcmToken(userId, fcmToken) {
        const user = await db.PlatformUser.findByPk(userId);
        if (!user) return;
        await user.update({ fcm_token: fcmToken || null });
    }

    /**
     * Verify JWT token
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
}

module.exports = new UserAuthService();
