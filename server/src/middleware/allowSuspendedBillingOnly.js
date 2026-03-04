/**
 * When tenant is suspended, allow only billing-related routes.
 * Use after authenticateTenant. Must run on tenant and subscription routes.
 *
 * Allowed when suspended:
 * - /bills (and /bills/*) – pay outstanding bill, view invoices
 * - /profile – update profile
 * Add any new billing-related first path segment here if it must work while suspended.
 */

const BILLING_ALLOWED_PATHS = [
    '/bills',
    '/profile'
];

function normalizePath(path) {
    return path.replace(/^\//, '').split('?')[0].split('/')[0] || '/';
}

/**
 * For tenant routes (mounted at /api/v1/tenant): req.path is e.g. /bills or /profile
 */
const allowSuspendedBillingOnlyTenant = (req, res, next) => {
    if (!req.tenantSuspended) return next();
    const path = req.path.replace(/^\//, '').split('/')[0] || '';
    const allowed = BILLING_ALLOWED_PATHS.some((p) => path === p.replace(/^\//, ''));
    if (allowed) return next();
    return res.status(403).json({
        success: false,
        message: 'Account suspended. Please pay your outstanding bill to restore access.',
        code: 'ACCOUNT_SUSPENDED'
    });
};

/**
 * For subscription routes (mounted at /api/v1/subscription): allow only GET /current
 */
const allowSuspendedBillingOnlySubscription = (req, res, next) => {
    if (!req.tenantSuspended) return next();
    if (req.method === 'GET' && (req.path === '/current' || req.path === 'current')) return next();
    return res.status(403).json({
        success: false,
        message: 'Account suspended. Please pay your outstanding bill to restore access.',
        code: 'ACCOUNT_SUSPENDED'
    });
};

module.exports = {
    allowSuspendedBillingOnlyTenant,
    allowSuspendedBillingOnlySubscription
};
