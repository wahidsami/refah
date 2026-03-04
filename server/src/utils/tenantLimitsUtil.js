const db = require('../models');
const { getActiveSubscriptionForTenant } = require('../services/tenantSubscriptionService');

/**
 * Checks a specific resource limit against the tenant's current active subscription package.
 * Uses shared subscription service so limits always match the recognized plan.
 *
 * @param {string} tenantId - The UUID of the tenant
 * @param {string} resourceName - The key name from the limits JSONB (e.g. 'maxStaff', 'maxServices')
 * @param {Function} getCurrentCountFn - An async function that returns the current usage count of the resource
 * @returns {Promise<{allowed: boolean, limit: number, current: number, packageName: string}>}
 */
const checkResourceLimit = async (tenantId, resourceName, getCurrentCountFn) => {
    const result = await getActiveSubscriptionForTenant(tenantId, {
        statuses: ['active', 'trial', 'APPROVED_FREE_ACTIVE']
    });
    if (!result) {
        return {
            allowed: false,
            limit: 0,
            current: 0,
            packageName: 'None'
        };
    }
    const packageLimits = result.package?.limits || {};
    const limit = packageLimits[resourceName];
    const packageName = result.package?.name || 'Unknown';

    // Limit of -1 means unlimited
    if (limit === -1) {
        return {
            allowed: true,
            limit: -1,
            current: await getCurrentCountFn(),
            packageName
        };
    }

    // Default to 0 if limit undefined
    if (limit === undefined || limit === null) {
        return {
            allowed: false,
            limit: 0,
            current: await getCurrentCountFn(),
            packageName
        };
    }

    // Compare actual usage against limit
    const current = await getCurrentCountFn();

    return {
        allowed: current < limit,
        limit,
        current,
        packageName
    };
};

module.exports = {
    checkResourceLimit
};
