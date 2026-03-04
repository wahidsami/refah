const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Validate environment variables FIRST
const validateEnvironment = require('./middleware/validateEnvironment');
validateEnvironment();

const db = require('./models');
const { initRlsSession } = require('./utils/rlsSession');
const { initSlowQueryLogger } = require('./utils/slowQueryLogger');
const { startPoolMetricsLogger } = require('./utils/poolMetricsLogger');

initRlsSession(db.sequelize);
initSlowQueryLogger(db.sequelize);
let stopPoolMetrics = null;
if (db.sequelize && db.sequelize.getDialect?.() === 'postgres') {
    stopPoolMetrics = startPoolMetricsLogger(db.sequelize);
}
const redisService = require('./services/redisService');
const requestId = require('./middleware/requestId');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10);
let server = null;

// ========================================
// CORS Configuration - Environment-based
// ========================================
const getCorsOrigins = () => {
    const env = process.env.NODE_ENV || 'development';

    if (env === 'production') {
        return (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean) || [
            'https://rifah.sa',
            'https://www.rifah.sa',
            'https://admin.rifah.sa',
            'https://tenant.rifah.sa',
            'https://public.rifah.sa'
        ];
    }

    // Development: web UIs + Expo web (RifahMobile/RefahStaff in browser)
    const devOrigins = [
        'http://localhost:3000',   // Client App
        'http://localhost:3001',   // Legacy
        'http://localhost:3002',   // Admin Dashboard
        'http://localhost:3003',   // Tenant Dashboard
        'http://localhost:3004',   // Public Page
        'http://localhost:8081',   // Expo web (Metro default)
        'http://localhost:8082',   // Expo web (alternate port)
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3002',
        'http://127.0.0.1:3003',
        'http://127.0.0.1:3004',
        'http://127.0.0.1:8081',
        'http://127.0.0.1:8082'
    ];
    // Allow Expo tunnel HTTPS origins so web can call API when CORS_ORIGINS includes them
    const extra = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
    return [...new Set([...devOrigins, ...extra])];
};

// Initialize Redis
redisService.initRedis();

const PORT = process.env.PORT || 5000;

// Middleware - CORS with environment-based origins
app.use(cors({
    origin: getCorsOrigins(),
    credentials: true
}));

// Serve uploaded files FIRST (before helmet) with proper CORS headers
app.use('/uploads', (req, res, next) => {
    // Set CORS headers explicitly
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.removeHeader('Cross-Origin-Resource-Policy'); // Remove if exists
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
}, express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res, filePath) => {
        // Ensure images are served with correct content type
        if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (filePath.endsWith('.gif')) {
            res.setHeader('Content-Type', 'image/gif');
        } else if (filePath.endsWith('.webp')) {
            res.setHeader('Content-Type', 'image/webp');
        }
        // Explicitly set CORP to cross-origin and remove any blocking headers
        res.removeHeader('Cross-Origin-Resource-Policy');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// Configure helmet AFTER static files - DISABLE CORP completely
// Only enable helmet in production, or configure it to not block images
if (process.env.NODE_ENV === 'production') {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
            },
        },
        crossOriginResourcePolicy: false
    }));
} else {
    // Development: Use minimal helmet without CORP
    app.use(helmet({
        contentSecurityPolicy: false, // Disable CSP in dev
        crossOriginResourcePolicy: false
    }));
}

app.use(express.json());
app.use(requestId);
app.use(requestLogger);
app.use(require('./middleware/metricsMiddleware'));

// Health endpoints (no rate limit)
app.use(require('./routes/healthRoutes'));

// Rate limiting middleware
const {
    generalLimiter,
    authLimiter,
    passwordResetLimiter,
    paymentLimiter,
    uploadLimiter
} = require('./middleware/rateLimiter');

// Apply general rate limiting to all API requests
app.use('/api/v1/', generalLimiter);

// Routes
const userAuthRoutes = require('./routes/userAuthRoutes');
const tenantAuthRoutes = require('./routes/tenantAuthRoutes'); // New: Tenant auth
const staffAuthRoutes = require('./routes/staffAuthRoutes'); // New: Staff app auth
const staffAppRoutes = require('./routes/staffAppRoutes'); // New: Staff app internal APIs
const bookingRoutes = require('./routes/bookingRoutes');
const staffRoutes = require('./routes/staffRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const tenantRoutes = require('./routes/tenantRoutes'); // Tenant dashboard APIs (protected)
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const superAdminAuthRoutes = require('./routes/superAdminAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminSettingsController = require('./controllers/adminSettingsController');

// Apply strict auth limiting to user authentication
app.use('/api/v1/auth/user', authLimiter, userAuthRoutes); // End user auth
// Apply strict auth limiting to tenant authentication
app.use('/api/v1/auth/tenant', authLimiter, tenantAuthRoutes); // New: Tenant auth
// Apply strict auth limiting to staff authentication
app.use('/api/v1/auth/staff', authLimiter, staffAuthRoutes); // New: Staff app auth
// Apply strict auth limiting to admin authentication
app.use('/api/v1/auth/admin', authLimiter, superAdminAuthRoutes); // Super Admin auth
app.use('/api/v1/admin', adminRoutes); // Admin APIs
app.use('/api/v1/tenant', tenantRoutes); // Tenant dashboard APIs (protected)
app.get('/api/v1/settings/global', adminSettingsController.getGlobalSettings); // Public global settings endpoint
app.get('/api/v1/categories', async (req, res) => {
    try {
        const { ServiceCategory } = require('./models');
        const categories = await ServiceCategory.findAll({
            where: { isActive: true },
            order: [['sortOrder', 'ASC']],
            attributes: ['id', 'name_en', 'name_ar', 'slug', 'icon', 'sortOrder']
        });
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Error fetching public categories:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
}); // Public service categories endpoint
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/staff/me', staffAppRoutes); // New: Staff app APIs
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/orders', require('./routes/orderRoutes')); // Order management
app.use('/api/v1/subscription', subscriptionRoutes); // Subscription management (singular for authenticated routes)
app.use('/api/v1/subscriptions', subscriptionRoutes); // Subscription management (plural for public routes)

// Public routes (no authentication required)
const publicRoutes = require('./routes/publicRoutes');
app.use('/api/v1/public', publicRoutes);

// Hot Deals routes (public + tenant + admin)
const hotDealsRoutes = require('./routes/hotDealsRoutes');
app.use('/api/v1', hotDealsRoutes);

// Featured tenants routes
const featuredRoutes = require('./routes/featuredRoutes');
app.use('/api/v1', featuredRoutes);

// Public tenant listing (for client app discovery)
const publicTenantController = require('./controllers/publicTenantController');
app.get('/api/v1/tenants', publicTenantController.getAllTenants);

// Cleanup routes (temporary - for one-time operations)
// Cleanup routes removed - one-time operations completed
// Root
app.get('/', (req, res) => {
    res.json({ message: 'Rifah API is running' });
});

// 404 fallback (so error handler returns consistent JSON)
app.use((req, res, next) => {
    const err = new Error('Not found');
    err.statusCode = 404;
    next(err);
});
// Global error handler (must be last)
app.use(errorHandler);

// Test endpoint to verify uploads directory
app.get('/test-uploads', (req, res) => {
    const uploadsPath = path.join(__dirname, '../uploads');
    const fs = require('fs');
    try {
        const exists = fs.existsSync(uploadsPath);
        const files = exists ? fs.readdirSync(path.join(uploadsPath, 'profiles')) : [];
        res.json({
            uploadsPath,
            exists,
            files: files.slice(0, 5) // First 5 files
        });
    } catch (error) {
        res.json({ error: error.message, uploadsPath });
    }
});

// Create default super admin (uses SUPERADMIN_PASSWORD from env; in production it is required by validateEnvironment)
const createDefaultSuperAdmin = async () => {
    const password = process.env.SUPERADMIN_PASSWORD;
    if (!password) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('SUPERADMIN_PASSWORD is required in production');
        }
        return;
    }
    try {
        const existingAdmin = await db.SuperAdmin.findOne({ where: { role: 'super_admin' } });
        if (!existingAdmin) {
            await db.SuperAdmin.create({
                email: 'admin@rifah.sa',
                password,
                firstName: 'Super',
                lastName: 'Admin',
                role: 'super_admin',
                permissions: {
                    tenants: { view: true, create: true, edit: true, delete: true, approve: true },
                    users: { view: true, create: true, edit: true, delete: true },
                    financial: { view: true, export: true, refund: true },
                    settings: { view: true, edit: true }
                }
            });
            console.log('✅ Default Super Admin created: admin@rifah.sa');
        }
    } catch (error) {
        console.log('Super admin setup:', error.message);
    }
};

// Database Connection and Server Start
const startServer = async () => {
    try {
        await db.sequelize.authenticate();
        console.log('Database connection established successfully.');

        // Sync all models (force: false = create missing tables/columns only; safe in production).
        // Migrations can be run separately to add indexes, RLS, etc.
        await db.SuperAdmin.sync({ force: false });
        await db.ActivityLog.sync({ force: false });
        await db.SubscriptionPackage.sync({ force: false });
        await db.Tenant.sync({ force: false });
        await db.TenantSubscription.sync({ force: false });
        await db.TenantUsage.sync({ force: false });
        await db.UsageAlert.sync({ force: false });
        await db.PlatformUser.sync({ force: false });
        await db.PaymentMethod.sync({ force: false });
        await db.User.sync({ force: false });
        await db.Service.sync({ force: false });
        await db.Product.sync({ force: false });
        await db.Customer.sync({ force: false });
        await db.Staff.sync({ force: false });
        await db.ServiceEmployee.sync({ force: false });
        await db.StaffSchedule.sync({ force: false });
        try {
            await db.StaffShift.sync({ force: false });
        } catch (err) {
            console.warn('⚠️  StaffShift sync warning:', err.message);
        }
        try {
            await db.StaffBreak.sync({ force: false });
        } catch (err) {
            console.warn('⚠️  StaffBreak sync warning:', err.message);
        }
        try {
            await db.StaffTimeOff.sync({ force: false });
        } catch (err) {
            console.warn('⚠️  StaffTimeOff sync warning:', err.message);
        }
        try {
            await db.StaffScheduleOverride.sync({ force: false });
        } catch (err) {
            console.warn('⚠️  StaffScheduleOverride sync warning:', err.message);
        }
        await db.Appointment.sync({ force: false });
        try {
            await db.StaffPermission.sync({ force: false });
        } catch (err) {
            console.warn('⚠️  StaffPermission sync warning:', err.message);
        }
        try {
            await db.StaffPayroll.sync({ force: false });
        } catch (err) {
            console.warn('⚠️  StaffPayroll sync warning:', err.message);
        }
        try {
            await db.StaffMessage.sync({ force: false });
        } catch (err) {
            console.warn('⚠️  StaffMessage sync warning:', err.message);
        }
        try {
            await db.Review.sync({ force: false });
        } catch (err) {
            console.warn('⚠️  Review sync warning:', err.message);
        }
        await db.CustomerInsight.sync({ force: false });
        await db.Order.sync({ force: false });
        await db.OrderItem.sync({ force: false });
        await db.Transaction.sync({ force: false });
        await db.PublicPageData.sync({ force: false });
        console.log('✅ Database synced successfully.');

        // Create default super admin if none exists
        await createDefaultSuperAdmin();

        // Seed default subscription packages
        const { seedDefaultPackages } = require('./utils/seedPackages');
        await seedDefaultPackages();

        server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server is running on port ${PORT} at 0.0.0.0`);
        });

        // Billing cron: expire unpaid bills and suspend after grace (every hour)
        const billingCron = require('./jobs/billingCron');
        setInterval(() => {
            billingCron.run().catch((err) => console.error('[BillingCron]', err.message));
        }, 60 * 60 * 1000);

        // Appointment reminder cron: send "notify me" reminders (every 10 minutes)
        const reminderCron = require('./jobs/reminderCron');
        setInterval(() => {
            reminderCron.run().catch((err) => console.error('[ReminderCron]', err.message));
        }, 10 * 60 * 1000);

        const shutdown = async (signal) => {
            console.log(`${signal} received, shutting down gracefully...`);
            let done = false;
            const forceExit = () => {
                if (!done) {
                    done = true;
                    console.error('Shutdown timeout, forcing exit');
                    process.exit(1);
                }
            };
            const t = setTimeout(forceExit, SHUTDOWN_TIMEOUT_MS);

            if (server) {
                server.close((err) => {
                    if (err) console.error('Server close error:', err);
                });
            }
            if (stopPoolMetrics) stopPoolMetrics();
            try {
                await db.sequelize.close();
                console.log('Database connection closed.');
            } catch (e) {
                console.error('Sequelize close error:', e);
            }
            try {
                await redisService.close();
                console.log('Redis connection closed.');
            } catch (e) {
                console.error('Redis close error:', e);
            }
            clearTimeout(t);
            done = true;
            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

startServer();
