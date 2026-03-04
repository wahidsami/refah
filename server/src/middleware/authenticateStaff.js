const jwt = require('jsonwebtoken');
const db = require('../models');

/**
 * Middleware to authenticate RifahStaff mobile app requests
 * Validates JWT, checks if staff is active and app is enabled by admin
 */
const authenticateStaff = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No auth token provided'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify it's a staff token
        if (decoded.role !== 'staff') {
            return res.status(403).json({
                success: false,
                message: 'Invalid role for this endpoint'
            });
        }

        // Fetch staff and verify they exist, are active, and app is still enabled
        const staff = await db.Staff.findByPk(decoded.sub, {
            include: [{
                model: db.StaffPermission,
                as: 'permissions'
            }]
        });

        if (!staff) {
            return res.status(401).json({
                success: false,
                message: 'Staff account no longer exists'
            });
        }

        if (!staff.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your staff account is inactive. Please contact the salon admin.'
            });
        }

        if (!staff.app_enabled) {
            return res.status(403).json({
                success: false,
                message: 'App access has been disabled for your account. Please contact the salon admin.'
            });
        }

        // Attach staff data to request
        req.staffId = decoded.sub;
        req.tenantId = decoded.tenantId;
        req.permissions = staff.permissions || {
            view_earnings: false,
            view_reviews: true,
            reply_reviews: false,
            view_clients: false
        };
        req.user = {
            id: staff.id,
            tenantId: staff.tenantId,
            role: 'staff',
            must_change_password: staff.must_change_password
        };

        // If they must change password, only allow them to access the change-password route or logout
        if (staff.must_change_password) {
            // Check if the current route is allowed
            const allowedRoutes = ['/change-password', '/logout'];
            const isAllowed = allowedRoutes.some(route => req.originalUrl.includes(route));

            if (!isAllowed) {
                return res.status(403).json({
                    success: false,
                    message: 'Password change required',
                    action_required: 'CHANGE_PASSWORD'
                });
            }
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired',
                error_code: 'TOKEN_EXPIRED'
            });
        }
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

module.exports = authenticateStaff;
