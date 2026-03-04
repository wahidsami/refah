const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/staffAppointmentsController');
const authenticateStaff = require('../middleware/authenticateStaff');

// All regular staff routes are protected
router.use(authenticateStaff);

// Today's appointments
router.get('/appointments/today', appointmentsController.getTodayAppointments);

// Update specific appointment status
router.patch('/appointments/:id/status', appointmentsController.updateAppointmentStatus);

const scheduleController = require('../controllers/staffScheduleController');
const messagesController = require('../controllers/staffMessagesController');

// Schedule endpoints
router.get('/schedule', scheduleController.getSchedule);

// Time off endpoints
router.get('/time-off', scheduleController.getTimeOffRequests);
router.post('/time-off', scheduleController.submitTimeOffRequest);
router.delete('/time-off/:id', scheduleController.cancelTimeOffRequest);

// Messages endpoints
router.get('/messages', messagesController.getMessages);
router.patch('/messages/:id/read', messagesController.markAsRead);

// FCM Notifications
router.post('/fcm-token', messagesController.registerFcmToken);

// Earnings (Payroll)
const financialsController = require('../controllers/staffFinancialsController');
router.get('/earnings', financialsController.getEarnings);

// Reviews
router.get('/reviews', financialsController.getMyReviews);
router.post('/reviews/:id/reply', financialsController.replyToReview);

module.exports = router;
