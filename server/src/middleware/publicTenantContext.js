/**
 * Derives req.tenantId from public route params (:tenantId or :slug) and runs setTenantContext
 * so RLS (app.tenant_id) applies before any tenant-scoped DB queries.
 * If :tenantId does not look like a UUID, it is resolved as slug.
 */

const db = require('../models');
const setTenantContext = require('./setTenantContext');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function publicTenantContext(req, res, next) {
    if (req.params.tenantId) {
        const param = req.params.tenantId;
        if (UUID_REGEX.test(param)) {
            req.tenantId = param;
            return setTenantContext(req, res, next);
        }
        try {
            const tenant = await db.Tenant.findOne({
                where: { slug: param },
                attributes: ['id']
            });
            req.tenantId = tenant ? tenant.id : null;
        } catch (err) {
            return next(err);
        }
        return setTenantContext(req, res, next);
    }
    if (req.params.slug) {
        try {
            const tenant = await db.Tenant.findOne({
                where: { slug: req.params.slug },
                attributes: ['id']
            });
            req.tenantId = tenant ? tenant.id : null;
        } catch (err) {
            return next(err);
        }
        return setTenantContext(req, res, next);
    }
    setTenantContext(req, res, next);
}

module.exports = publicTenantContext;
