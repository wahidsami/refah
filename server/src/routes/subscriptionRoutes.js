const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateTenant } = require('../middleware/authTenant');
const { requireActiveSubscription } = require('../middleware/checkSubscription');

// Public routes (no authentication required)
// Get available packages for registration/browsing
router.get('/packages', subscriptionController.getAvailablePackages);

// All routes below require tenant authentication
router.use(authenticateTenant);
router.use(require('../middleware/allowSuspendedBillingOnly').allowSuspendedBillingOnlySubscription);

// Get current subscription
router.get('/current', subscriptionController.getCurrentSubscription);

// Get usage statistics
router.get('/usage', subscriptionController.getUsageStats);

// Get usage alerts
router.get('/alerts', subscriptionController.getUsageAlerts);

// Acknowledge alert
router.patch('/alerts/:alertId/acknowledge', subscriptionController.acknowledgeAlert);

// Request subscription change (upgrade/downgrade) — legacy, logs only
router.post('/change-request', subscriptionController.requestSubscriptionChange);

// Request upgrade — creates Bill, 48h grace, returns payment link
router.post('/request-upgrade', subscriptionController.requestUpgrade);

module.exports = router;

