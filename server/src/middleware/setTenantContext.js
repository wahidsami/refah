/**
 * Sets request-scoped tenant context for RLS (app.tenant_id).
 * Run after auth so req.tenantId is set for tenant-authenticated routes.
 * For public routes that are tenant-scoped by param/body, set req.tenantId earlier (e.g. from param).
 */

const tenantContext = require('../utils/tenantContext');

function setTenantContext(req, res, next) {
    const tenantId = req.tenantId || null;
    tenantContext.run({ tenantId }, () => next());
}

module.exports = setTenantContext;
