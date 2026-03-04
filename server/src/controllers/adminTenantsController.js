const db = require('../models');
const { Op } = require('sequelize');
const { parseLimitOffset, DEFAULT_MAX_PAGE_SIZE } = require('../utils/pagination');

/**
 * Get all tenants with filters and pagination
 */
const listTenants = async (req, res) => {
    try {
        const { limit, offset, page } = parseLimitOffset(req, 20, DEFAULT_MAX_PAGE_SIZE);
        const {
            status,
            businessType,
            plan,
            city,
            search,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const where = {};

        // Apply filters
        if (status) where.status = status;
        if (businessType) where.businessType = { [Op.contains]: [businessType] };
        if (plan) where.plan = plan;
        if (city) where.city = city;

        // Search by name, email, phone
        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } },
                { phone: { [Op.iLike]: `%${search}%` } },
                { ownerName: { [Op.iLike]: `%${search}%` } },
                { ownerEmail: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows: tenants } = await db.Tenant.findAndCountAll({
            where,
            order: [[sortBy, sortOrder]],
            limit,
            offset
        });

        res.json({
            success: true,
            tenants,
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
        console.error('List tenants error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tenants',
            error: error.message
        });
    }
};

/**
 * Get pending tenants for approval
 */
const getPendingTenants = async (req, res) => {
    try {
        const tenants = await db.Tenant.findAll({
            where: { status: 'pending' },
            order: [['createdAt', 'ASC']]
        });

        res.json({
            success: true,
            tenants,
            count: tenants.length
        });

    } catch (error) {
        console.error('Get pending tenants error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending tenants'
        });
    }
};

/**
 * Get single tenant details
 */
const getTenantDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const tenant = await db.Tenant.findByPk(id, {
            include: [
                {
                    model: db.User,
                    attributes: ['id', 'email', 'role', 'createdAt'],
                    required: false
                },
                {
                    model: db.TenantSubscription,
                    as: 'subscription',
                    required: false,
                    include: [{
                        model: db.SubscriptionPackage,
                        as: 'package',
                        attributes: ['id', 'name', 'name_ar', 'slug', 'monthlyPrice', 'sixMonthPrice', 'annualPrice', 'limits'],
                        required: false
                    }]
                }
            ]
        });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        // Get activity logs for this tenant
        const activities = await db.ActivityLog.findAll({
            where: {
                entityType: 'tenant',
                entityId: id
            },
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        // Get booking stats
        const bookingStats = await getBookingStats(tenant.dbSchema);

        res.json({
            success: true,
            tenant,
            activities,
            bookingStats
        });

    } catch (error) {
        console.error('Get tenant details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tenant details',
            error: error.message
        });
    }
};

const { generateBillNumber, generatePaymentToken } = require('../utils/billUtils');

/**
 * Check if package is free (no payment required)
 */
function isFreePackage(pkg) {
    if (!pkg) return true;
    const m = parseFloat(pkg.monthlyPrice) || 0;
    const s = parseFloat(pkg.sixMonthPrice) || 0;
    const a = parseFloat(pkg.annualPrice) || 0;
    if (m > 0 || s > 0 || a > 0) return false;
    const slug = (pkg.slug || '').toLowerCase();
    return slug === 'free' || slug === 'free-trial';
}

/**
 * Approve tenant — branch by plan: Free → ACTIVE + email; Paid → APPROVED_PENDING_PAYMENT + Bill + 48h grace + email with Pay link
 */
const approveTenant = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const tenant = await db.Tenant.findByPk(id);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        if (tenant.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot approve tenant with status: ${tenant.status}`
            });
        }

        // Update tenant status (approved)
        await tenant.update({
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: req.adminId,
            planStartDate: new Date(),
            planEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // placeholder; real end set from subscription
        });

        const now = new Date();
        const subscription = await db.TenantSubscription.findOne({
            where: { tenantId: tenant.id, status: 'PENDING_APPROVAL' },
            include: [{ model: db.SubscriptionPackage, as: 'package' }]
        });

        const { sendApprovalEmail, sendApprovalEmailPaid } = require('../utils/emailService');
        let isPaidPlan = false;

        if (subscription && subscription.package) {
            const pkg = subscription.package;
            const isFree = isFreePackage(pkg);
            isPaidPlan = !isFree;

            if (isFree) {
                // Free plan: set subscription ACTIVE, set period dates
                const periodEnd = new Date(now);
                if (subscription.billingCycle === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
                else if (subscription.billingCycle === 'sixMonth') periodEnd.setMonth(periodEnd.getMonth() + 6);
                else if (subscription.billingCycle === 'annual') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
                else periodEnd.setMonth(periodEnd.getMonth() + 1);

                await subscription.update({
                    status: 'active',
                    approvedAt: now,
                    approvedByAdminId: req.adminId,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    nextBillingDate: periodEnd
                });

                // Ensure usage record exists
                let usage = await db.TenantUsage.findOne({ where: { tenantId: tenant.id } });
                if (!usage) {
                    await db.TenantUsage.create({
                        tenantId: tenant.id,
                        currentPeriod: now.toISOString().substring(0, 7),
                        bookingsThisMonth: 0,
                        bookingsTotal: 0,
                        activeStaff: 0,
                        activeServices: 0,
                        activeProducts: 0,
                        storageUsedMB: 0,
                        emailCampaignsThisMonth: 0,
                        smsCampaignsThisMonth: 0,
                        apiCallsThisMonth: 0,
                        lastResetDate: now
                    });
                }

                sendApprovalEmail(tenant).catch(err => console.error('[Approval] Failed to send approval email:', err.message));
            } else {
                // Paid plan: APPROVED_PENDING_PAYMENT, 48h grace, create Bill, send email with Pay link
                const graceEndsAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
                const dueDate = new Date(graceEndsAt);
                const dueDateStr = dueDate.toISOString().slice(0, 10);

                await subscription.update({
                    status: 'APPROVED_PENDING_PAYMENT',
                    approvedAt: now,
                    approvedByAdminId: req.adminId,
                    gracePeriodEnds: graceEndsAt
                });

                const amount = subscription.billingCycle === 'monthly' ? parseFloat(pkg.monthlyPrice)
                    : subscription.billingCycle === 'sixMonth' ? parseFloat(pkg.sixMonthPrice)
                        : parseFloat(pkg.annualPrice);
                const billNumber = await generateBillNumber();
                const paymentToken = generatePaymentToken();

                await db.Bill.create({
                    tenantId: tenant.id,
                    tenantSubscriptionId: subscription.id,
                    billNumber,
                    amount: amount || 0,
                    currency: 'SAR',
                    dueDate: dueDateStr,
                    status: 'UNPAID',
                    paymentToken,
                    paymentTokenExpiresAt: graceEndsAt,
                    planSnapshot: {
                        packageName: pkg.name,
                        packageNameAr: pkg.name_ar,
                        billingCycle: subscription.billingCycle
                    },
                    type: 'initial'
                });

                const baseUrl = process.env.TENANT_DASHBOARD_URL || process.env.PAYMENT_PAGE_BASE_URL || 'http://localhost:3003';
                const locale = (tenant.preferredLocale || 'ar').toLowerCase().startsWith('ar') ? 'ar' : 'en';
                const paymentUrl = `${baseUrl.replace(/\/$/, '')}/${locale}/payment?token=${paymentToken}`;

                sendApprovalEmailPaid(tenant, { paymentUrl, billNumber, amount, dueDate: dueDateStr }).catch(err =>
                    console.error('[Approval] Failed to send approval-please-pay email:', err.message)
                );
            }
        } else {
            // No PENDING_APPROVAL subscription (e.g. legacy): initialize free trial
            const { initializeTenantSubscription } = require('../utils/initializeTenantSubscription');
            try {
                await initializeTenantSubscription(tenant.id, 'free-trial');
            } catch (subscriptionError) {
                console.error('Failed to initialize subscription:', subscriptionError);
            }
            sendApprovalEmail(tenant).catch(err => console.error('[Approval] Failed to send approval email:', err.message));
        }

        await db.ActivityLog.create({
            entityType: 'tenant',
            entityId: tenant.id,
            action: 'approved',
            performedByType: 'super_admin',
            performedById: req.adminId,
            performedByName: req.adminName,
            details: { notes },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        const message = isPaidPlan
            ? 'Tenant approved. Payment link sent — please pay within 48 hours.'
            : 'Tenant approved successfully. Subscription activated.';

        res.json({
            success: true,
            message,
            tenant
        });
    } catch (error) {
        console.error('Approve tenant error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve tenant',
            error: error.message
        });
    }
};

/**
 * Reject tenant
 */
const rejectTenant = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const tenant = await db.Tenant.findByPk(id);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        if (tenant.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot reject tenant with status: ${tenant.status}`
            });
        }

        // Update tenant status
        await tenant.update({
            status: 'rejected',
            rejectionReason: reason
        });

        // Log activity
        await db.ActivityLog.create({
            entityType: 'tenant',
            entityId: tenant.id,
            action: 'rejected',
            performedByType: 'super_admin',
            performedById: req.adminId,
            performedByName: req.adminName,
            details: { reason },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        // Send rejection email (don't wait for it, don't fail if it errors)
        const { sendRejectionEmail } = require('../utils/emailService');
        sendRejectionEmail(tenant, reason).catch(err => {
            console.error('[Rejection] Failed to send rejection email:', err.message);
            // Don't throw - email failure shouldn't affect rejection
        });

        res.json({
            success: true,
            message: 'Tenant rejected',
            tenant
        });

    } catch (error) {
        console.error('Reject tenant error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject tenant',
            error: error.message
        });
    }
};

/**
 * Suspend tenant
 */
const suspendTenant = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Suspension reason is required'
            });
        }

        const tenant = await db.Tenant.findByPk(id);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const previousStatus = tenant.status;

        await tenant.update({
            status: 'suspended',
            suspensionReason: reason
        });

        // Log activity
        await db.ActivityLog.create({
            entityType: 'tenant',
            entityId: tenant.id,
            action: 'suspended',
            performedByType: 'super_admin',
            performedById: req.adminId,
            performedByName: req.adminName,
            previousValue: { status: previousStatus },
            newValue: { status: 'suspended' },
            details: { reason },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({
            success: true,
            message: 'Tenant suspended',
            tenant
        });

    } catch (error) {
        console.error('Suspend tenant error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to suspend tenant',
            error: error.message
        });
    }
};

/**
 * Activate tenant (re-activate after suspension)
 */
const activateTenant = async (req, res) => {
    try {
        const { id } = req.params;

        const tenant = await db.Tenant.findByPk(id);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const previousStatus = tenant.status;

        await tenant.update({
            status: 'approved',
            suspensionReason: null
        });

        // Log activity
        await db.ActivityLog.create({
            entityType: 'tenant',
            entityId: tenant.id,
            action: 'activated',
            performedByType: 'super_admin',
            performedById: req.adminId,
            performedByName: req.adminName,
            previousValue: { status: previousStatus },
            newValue: { status: 'approved' },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({
            success: true,
            message: 'Tenant activated',
            tenant
        });

    } catch (error) {
        console.error('Activate tenant error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to activate tenant',
            error: error.message
        });
    }
};

/**
 * Update tenant details
 */
const updateTenant = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const tenant = await db.Tenant.findByPk(id);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        // Store previous values for logging
        const previousValue = tenant.toJSON();

        // Allowed fields to update
        const allowedFields = [
            'name', 'nameAr', 'businessType', 'email', 'phone', 'whatsapp',
            'website', 'address', 'city', 'description', 'descriptionAr',
            'plan', 'planStartDate', 'planEndDate', 'settings', 'layoutTemplate',
            'themeColors'
        ];

        const filteredUpdates = {};
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        }

        await tenant.update(filteredUpdates);

        // Log activity
        await db.ActivityLog.create({
            entityType: 'tenant',
            entityId: tenant.id,
            action: 'updated',
            performedByType: 'super_admin',
            performedById: req.adminId,
            performedByName: req.adminName,
            previousValue,
            newValue: filteredUpdates,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({
            success: true,
            message: 'Tenant updated',
            tenant
        });

    } catch (error) {
        console.error('Update tenant error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update tenant',
            error: error.message
        });
    }
};

/**
 * Get tenant activity logs
 */
const getTenantActivities = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const offset = (page - 1) * limit;

        const { count, rows: activities } = await db.ActivityLog.findAndCountAll({
            where: {
                entityType: 'tenant',
                entityId: id
            },
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            activities,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });

    } catch (error) {
        console.error('Get tenant activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activities'
        });
    }
};

// Helper function to get booking stats for a tenant
async function getBookingStats(dbSchema) {
    try {
        // This would query the tenant's schema for booking stats
        // For now, return mock data
        return {
            totalBookings: 0,
            completedBookings: 0,
            cancelledBookings: 0,
            totalRevenue: 0,
            averageRating: 0
        };
    } catch (error) {
        console.error('Get booking stats error:', error);
        return null;
    }
}

/**
 * Delete a tenant and all related data (cascade).
 * Used by admin dashboard clients table.
 */
const deleteTenant = async (req, res) => {
    const { id: tenantId } = req.params;
    try {
        const tenant = await db.Tenant.findByPk(tenantId);
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }

        const transaction = await db.sequelize.transaction();
        try {
            // Delete in dependency order to respect FKs (child tables first)

            // Bills (tenant + subscription scoped)
            await db.Bill.destroy({ where: { tenantId }, transaction });

            // Subscriptions
            await db.TenantSubscription.destroy({ where: { tenantId }, transaction });

            // Orders: payment transactions and order items first
            const orders = await db.Order.findAll({ where: { tenantId }, attributes: ['id'], transaction });
            const orderIds = orders.map(o => o.id);
            if (orderIds.length > 0) {
                await db.PaymentTransaction.destroy({ where: { orderId: orderIds }, transaction });
                await db.OrderItem.destroy({ where: { orderId: orderIds }, transaction });
            }
            await db.Order.destroy({ where: { tenantId }, transaction });

            // Transactions (tenant financial records)
            if (db.Transaction) {
                await db.Transaction.destroy({ where: { tenantId }, transaction });
            }

            // Reviews, payroll, messages (tenant-scoped)
            if (db.Review) await db.Review.destroy({ where: { tenantId }, transaction });
            if (db.StaffPayroll) await db.StaffPayroll.destroy({ where: { tenantId }, transaction });
            if (db.StaffMessage) await db.StaffMessage.destroy({ where: { tenantId }, transaction });

            // Appointments
            await db.Appointment.destroy({ where: { tenantId }, transaction });

            // Services: service_employees first, then services
            const services = await db.Service.findAll({ where: { tenantId }, attributes: ['id'], transaction });
            const serviceIds = services.map(s => s.id);
            if (serviceIds.length > 0 && db.ServiceEmployee) {
                await db.ServiceEmployee.destroy({ where: { serviceId: serviceIds }, transaction });
            }
            await db.Service.destroy({ where: { tenantId }, transaction });

            // Products, usage, alerts, insights
            await db.Product.destroy({ where: { tenantId }, transaction });
            if (db.TenantUsage) await db.TenantUsage.destroy({ where: { tenantId }, transaction });
            if (db.UsageAlert) await db.UsageAlert.destroy({ where: { tenantId }, transaction });
            if (db.CustomerInsight) await db.CustomerInsight.destroy({ where: { tenantId }, transaction });

            // Staff-related: tables use staffId, so get staff ids for this tenant first
            const staffList = await db.Staff.findAll({ where: { tenantId }, attributes: ['id'], transaction });
            const staffIds = staffList.map(s => s.id);
            if (staffIds.length > 0) {
                if (db.StaffSchedule) await db.StaffSchedule.destroy({ where: { staffId: staffIds }, transaction });
                if (db.StaffScheduleOverride) await db.StaffScheduleOverride.destroy({ where: { staffId: staffIds }, transaction });
                if (db.StaffTimeOff) await db.StaffTimeOff.destroy({ where: { staffId: staffIds }, transaction });
                if (db.StaffBreak) await db.StaffBreak.destroy({ where: { staffId: staffIds }, transaction });
                if (db.StaffShift) await db.StaffShift.destroy({ where: { staffId: staffIds }, transaction });
            }
            await db.Staff.destroy({ where: { tenantId }, transaction });

            // Tenant settings and public page
            await db.TenantSettings.destroy({ where: { tenantId }, transaction });
            if (db.PublicPageData) await db.PublicPageData.destroy({ where: { tenantId }, transaction });

            // Permissions and hot deals
            await db.StaffPermission.destroy({ where: { tenantId }, transaction });
            await db.HotDeal.destroy({ where: { tenantId }, transaction });

            // Platform users linked to tenant
            await db.User.destroy({ where: { tenantId }, transaction });

            // Finally the tenant
            await db.Tenant.destroy({ where: { id: tenantId }, transaction });

            await transaction.commit();
            return res.json({ success: true, message: 'Tenant and all related data deleted' });
        } catch (innerError) {
            await transaction.rollback();
            throw innerError;
        }
    } catch (error) {
        console.error('Delete tenant error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete tenant',
            error: error.message
        });
    }
};

module.exports = {
    listTenants,
    getPendingTenants,
    getTenantDetails,
    approveTenant,
    rejectTenant,
    suspendTenant,
    activateTenant,
    updateTenant,
    getTenantActivities,
    deleteTenant
};

