/**
 * Request-scoped tenant context for RLS (app.tenant_id).
 * Use setTenantContext middleware and run tenant routes inside it so RLS policies apply.
 */

const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Get current request's tenant ID (from AsyncLocalStorage). Used by DB layer to set app.tenant_id.
 */
function getTenantId() {
    const store = asyncLocalStorage.getStore();
    return store && store.tenantId != null ? store.tenantId : null;
}

/**
 * Run a function with tenant context. Used by middleware: run(req, res, next) with store = { tenantId: req.tenantId }.
 */
function run(store, fn) {
    return asyncLocalStorage.run(store, fn);
}

module.exports = {
    getTenantId,
    run,
    asyncLocalStorage
};
