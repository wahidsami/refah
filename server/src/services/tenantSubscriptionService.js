/**
 * Tenant Subscription Service
 * Single source of truth for loading a tenant's active subscription + package.
 * Uses direct TenantSubscription lookup with fallback so RLS and includes don't hide data.
 */

const { Op } = require('sequelize');
const db = require('../models');

/** Statuses that count as "active" for feature/limit checks (must match DB enum enum_tenant_subscriptions_status) */
const ACTIVE_SUBSCRIPTION_STATUSES = [
    'active',
    'trial',
    'APPROVED_FREE_ACTIVE',
    'APPROVED_PENDING_PAYMENT',
    'past_due' // allow usage/stats while in grace
];

/**
 * Get tenant's active subscription with package (and limits).
 * Prefers direct TenantSubscription lookup; falls back to Tenant include for compatibility.
 * @param {string} tenantId - Tenant UUID
 * @param {Object} [options] - { statuses: string[] } to override active statuses (default: ACTIVE_SUBSCRIPTION_STATUSES)
 * @returns {Promise<{ subscription: Object, package: Object }|null>}
 */
async function getActiveSubscriptionForTenant(tenantId, options = {}) {
    if (!tenantId) return null;
    const statuses = options.statuses || ACTIVE_SUBSCRIPTION_STATUSES;

    try {
        // 1) Direct lookup (avoids Tenant include + RLS quirks)
        let subscription = await db.TenantSubscription.findOne({
            where: { tenantId, status: { [Op.in]: statuses } },
            include: [{ model: db.SubscriptionPackage, as: 'package' }],
            order: [['currentPeriodEnd', 'DESC']]
        });

        if (!subscription) {
            // 2) Fallback: via Tenant include (original pattern)
            const tenant = await db.Tenant.findByPk(tenantId, {
                include: [{
                    model: db.TenantSubscription,
                    as: 'subscription',
                    where: { status: { [Op.in]: statuses } },
                    required: false,
                    include: [{ model: db.SubscriptionPackage, as: 'package' }]
                }]
            });
            subscription = tenant?.subscription;
        }

        if (!subscription || !subscription.package) return null;
        return { subscription, package: subscription.package };
    } catch (err) {
        console.error('[TenantSubscriptionService] getActiveSubscriptionForTenant error:', err.message);
        return null;
    }
}

/**
 * Get package limits for a tenant (convenience).
 * @param {string} tenantId
 * @returns {Promise<Object>} limits object or {}
 */
async function getPackageLimitsForTenant(tenantId) {
    const result = await getActiveSubscriptionForTenant(tenantId);
    return result?.package?.limits || {};
}

module.exports = {
    ACTIVE_SUBSCRIPTION_STATUSES,
    getActiveSubscriptionForTenant,
    getPackageLimitsForTenant
};
