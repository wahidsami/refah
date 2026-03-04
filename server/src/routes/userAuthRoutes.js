const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const userAuthController = require('../controllers/userAuthController');
const { authenticateUser } = require('../middleware/authUser');

// Configure multer for avatar uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/avatars');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
        }
    }
});

/**
 * @route   POST /api/v1/auth/user/register
 * @desc    Register a new platform user with optional avatar
 * @access  Public
 */
router.post('/register', upload.single('avatar'), userAuthController.register);

/**
 * @route   POST /api/v1/auth/user/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', userAuthController.login);

/**
 * @route   POST /api/v1/auth/user/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', userAuthController.refreshToken);

/**
 * @route   POST /api/v1/auth/user/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateUser, userAuthController.logout);

/**
 * @route   POST /api/v1/auth/user/register-fcm
 * @desc    Register FCM token for push notifications
 * @access  Private
 */
router.post('/register-fcm', authenticateUser, userAuthController.registerFcmToken);

/**
 * @route   GET /api/v1/auth/user/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get('/verify-email/:token', userAuthController.verifyEmail);

/**
 * @route   POST /api/v1/auth/user/send-phone-verification
 * @desc    Send phone verification code
 * @access  Private
 */
router.post('/send-phone-verification', authenticateUser, userAuthController.sendPhoneVerification);

/**
 * @route   POST /api/v1/auth/user/verify-phone
 * @desc    Verify phone with code
 * @access  Private
 */
router.post('/verify-phone', authenticateUser, userAuthController.verifyPhone);

/**
 * @route   POST /api/v1/auth/user/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', userAuthController.forgotPassword);

/**
 * @route   POST /api/v1/auth/user/reset-password/:token
 * @desc    Reset password
 * @access  Public
 */
router.post('/reset-password/:token', userAuthController.resetPassword);

/**
 * @route   POST /api/v1/auth/user/resend-verification
 * @desc    Resend verification email
 * @access  Private
 */
router.post('/resend-verification', authenticateUser, userAuthController.resendVerification);

module.exports = router;
