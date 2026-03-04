const db = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads (profile photos)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/profiles');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `profile-${req.userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
        }
    }
});

/**
 * Get user profile
 * GET /api/v1/users/profile
 */
const getProfile = async (req, res) => {
    try {
        const user = await db.PlatformUser.findByPk(req.userId, {
            attributes: { exclude: ['password', 'refreshToken'] }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: user.toSafeObject()
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update user profile
 * PUT /api/v1/users/profile
 */
const updateProfile = async (req, res) => {
    try {
        const { 
            firstName, 
            lastName, 
            dateOfBirth, 
            gender, 
            preferredLanguage, 
            notificationPreferences,
            // Address fields
            addressStreet,
            addressCity,
            addressBuilding,
            addressFloor,
            addressApartment,
            addressDistrict,
            addressPhone,
            addressNotes
        } = req.body;

        const user = await db.PlatformUser.findByPk(req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update allowed fields
        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
        if (gender !== undefined) user.gender = gender;
        if (preferredLanguage !== undefined) user.preferredLanguage = preferredLanguage;
        if (notificationPreferences) {
            user.notificationPreferences = {
                ...user.notificationPreferences,
                ...notificationPreferences
            };
        }

        // Update address fields
        if (addressStreet !== undefined) user.addressStreet = addressStreet;
        if (addressCity !== undefined) user.addressCity = addressCity;
        if (addressBuilding !== undefined) user.addressBuilding = addressBuilding;
        if (addressFloor !== undefined) user.addressFloor = addressFloor;
        if (addressApartment !== undefined) user.addressApartment = addressApartment;
        if (addressDistrict !== undefined) user.addressDistrict = addressDistrict;
        if (addressPhone !== undefined) user.addressPhone = addressPhone;
        if (addressNotes !== undefined) user.addressNotes = addressNotes;

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: user.toSafeObject()
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Upload profile photo
 * POST /api/v1/users/profile/photo
 */
const uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const user = await db.PlatformUser.findByPk(req.userId);
        if (!user) {
            // Delete uploaded file if user not found
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete old photo if exists
        if (user.profileImage) {
            const oldPhotoPath = path.join(__dirname, '../../uploads/profiles', path.basename(user.profileImage));
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }

        // Save photo path (relative to uploads folder)
        const photoPath = `/uploads/profiles/${req.file.filename}`;
        user.profileImage = photoPath;
        await user.save();

        res.json({
            success: true,
            message: 'Profile photo uploaded successfully',
            profileImage: photoPath
        });
    } catch (error) {
        console.error('Upload photo error:', error);
        // Delete uploaded file on error
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Change password
 * PUT /api/v1/users/password
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }

        const user = await db.PlatformUser.findByPk(req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isValidPassword = await user.validatePassword(currentPassword);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password (will be hashed by model hook)
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get user bookings (all salons)
 * GET /api/v1/users/bookings
 */
const getUserBookings = async (req, res) => {
    try {
        const { parseLimitOffset, DEFAULT_MAX_PAGE_SIZE } = require('../utils/pagination');
        const { limit, offset, page } = parseLimitOffset(req, 20, DEFAULT_MAX_PAGE_SIZE);

        const { status, startDate, endDate, tenantId } = req.query;

        const where = {
            platformUserId: req.userId
        };

        if (status) where.status = status;
        if (tenantId) where.tenantId = tenantId;

        if (startDate || endDate) {
            where.startTime = {};
            if (startDate) where.startTime[Op.gte] = new Date(startDate);
            if (endDate) where.startTime[Op.lte] = new Date(endDate);
        }

        const { count, rows: bookings } = await db.Appointment.findAndCountAll({
            where,
            include: [
                { model: db.Service, as: 'service' },
                { model: db.Staff, as: 'staff' },
                { model: db.Tenant, as: 'tenant', required: false }
            ],
            order: [['startTime', 'DESC']],
            limit,
            offset
        });

        res.json({
            success: true,
            bookings,
            appointments: bookings,
            count: bookings.length,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        if (error.statusCode === 400) {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('Get user bookings error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get services history (services user has booked)
 * GET /api/v1/users/services-history
 */
const getServicesHistory = async (req, res) => {
    try {
        const bookings = await db.Appointment.findAll({
            where: {
                platformUserId: req.userId,
                status: { [Op.in]: ['completed', 'confirmed'] }
            },
            include: [
                { model: db.Service, as: 'service' },
                { model: db.Tenant, as: 'tenant', required: false }
            ],
            order: [['startTime', 'DESC']]
        });

        // Group by service
        const serviceMap = new Map();
        bookings.forEach(booking => {
            if (booking.Service) {
                const serviceId = booking.Service.id;
                if (!serviceMap.has(serviceId)) {
                    serviceMap.set(serviceId, {
                        service: booking.Service,
                        count: 0,
                        totalSpent: 0,
                        lastBooked: null,
                        salons: new Set()
                    });
                }
                const entry = serviceMap.get(serviceId);
                entry.count++;
                entry.totalSpent += parseFloat(booking.price);
                if (!entry.lastBooked || booking.startTime > entry.lastBooked) {
                    entry.lastBooked = booking.startTime;
                }
                if (booking.tenant) {
                    entry.salons.add(booking.tenant.name);
                }
            }
        });

        const servicesHistory = Array.from(serviceMap.values()).map(entry => ({
            service: entry.service,
            count: entry.count,
            totalSpent: entry.totalSpent,
            lastBooked: entry.lastBooked,
            salons: Array.from(entry.salons)
        }));

        res.json({
            success: true,
            servicesHistory,
            count: servicesHistory.length
        });
    } catch (error) {
        console.error('Get services history error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get current user's notifications (inbox)
 * GET /api/v1/users/notifications
 */
const getNotifications = async (req, res) => {
    try {
        const { parseLimitOffset, DEFAULT_MAX_PAGE_SIZE } = require('../utils/pagination');
        const { limit, offset, page } = parseLimitOffset(req, 30, DEFAULT_MAX_PAGE_SIZE);

        const { count, rows: notifications } = await db.CustomerNotification.findAndCountAll({
            where: { platformUserId: req.userId },
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            attributes: ['id', 'type', 'title', 'body', 'data', 'readAt', 'createdAt', 'tenantId']
        });

        res.json({
            success: true,
            notifications,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Mark a notification as read
 * PATCH /api/v1/users/notifications/:id/read
 */
const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notif = await db.CustomerNotification.findOne({
            where: { id, platformUserId: req.userId }
        });
        if (!notif) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        await notif.update({ readAt: new Date() });
        res.json({ success: true, data: notif });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Add tip to a completed appointment
 * POST /api/v1/users/bookings/:id/tip
 * Body: { amount: number, paymentMethod?: 'cash' | 'card' | 'wallet' }
 */
const addAppointmentTip = async (req, res) => {
    try {
        const { id: appointmentId } = req.params;
        const { amount, paymentMethod } = req.body;
        const platformUserId = req.userId;

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid tip amount' });
        }

        const appointment = await db.Appointment.findByPk(appointmentId);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }
        if (appointment.platformUserId !== platformUserId) {
            return res.status(403).json({ success: false, message: 'Not your appointment' });
        }
        if (appointment.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Can only add tip for completed appointments' });
        }

        const maxTip = parseFloat(appointment.price || 0);
        const amountNum = parseFloat(amount);
        if (amountNum > maxTip) {
            return res.status(400).json({ success: false, message: 'Tip cannot exceed appointment price' });
        }

        if (appointment.tipAmount != null && parseFloat(appointment.tipAmount) > 0) {
            return res.status(400).json({ success: false, message: 'Tip already recorded for this appointment' });
        }

        const method = (paymentMethod && ['cash', 'card', 'wallet'].includes(paymentMethod)) ? paymentMethod : 'cash';
        await appointment.update({
            tipAmount: amountNum,
            tipPaidAt: new Date(),
            tipPaymentMethod: method
        });

        res.json({
            success: true,
            message: 'Tip recorded',
            appointment: await db.Appointment.findByPk(appointmentId, { attributes: ['id', 'tipAmount', 'tipPaidAt', 'tipPaymentMethod'] })
        });
    } catch (error) {
        console.error('Add tip error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    uploadPhoto,
    changePassword,
    getUserBookings,
    getServicesHistory,
    getNotifications,
    markNotificationRead,
    addAppointmentTip,
    uploadMiddleware: upload.single('photo')
};

