const express = require('express');
const router = express.Router();
const staffAuthController = require('../controllers/staffAuthController');
const authenticateStaff = require('../middleware/authenticateStaff');

// Public routes
router.post('/login', staffAuthController.login);
router.post('/refresh', staffAuthController.refreshToken);
router.post('/forgot-password', staffAuthController.forgotPassword);
router.post('/reset-password/:token', staffAuthController.resetPassword);

// Protected routes (requires staff JWT)
router.use(authenticateStaff);
router.post('/logout', staffAuthController.logout);
router.put('/change-password', staffAuthController.changePassword);
router.post('/register-fcm', staffAuthController.registerFcmToken);
router.get('/me', staffAuthController.getMe);

module.exports = router;
