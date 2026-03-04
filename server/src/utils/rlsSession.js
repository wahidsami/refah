/**
 * RLS session: set app.tenant_id on each DB connection when tenant context is present.
 * Call initRlsSession(db.sequelize) once after models are loaded.
 * Fail closed: if set_config fails, throw so the request errors rather than risk leakage.
 */

const tenantContext = require('./tenantContext');

function initRlsSession(sequelize) {
    if (!sequelize || sequelize.getDialect?.() !== 'postgres') return;

    sequelize.addHook('afterPoolAcquire', async (connection) => {
        if (!connection || typeof connection.query !== 'function') return;
        try {
            await connection.query("SELECT set_config('app.tenant_id', '', false)");
        } catch (err) {
            throw new Error(`RLS clear app.tenant_id failed: ${err.message}`);
        }
        const tenantId = tenantContext.getTenantId();
        if (tenantId) {
            try {
                await connection.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]);
            } catch (err) {
                throw new Error(`RLS set app.tenant_id failed: ${err.message}`);
            }
        }
    });

    const cm = sequelize.connectionManager;
    if (cm && typeof cm.releaseConnection === 'function') {
        const origRelease = cm.releaseConnection.bind(cm);
        cm.releaseConnection = function (connection) {
            if (connection && typeof connection.query === 'function') {
                connection.query("SELECT set_config('app.tenant_id', '', false)")
                    .then(() => origRelease(connection))
                    .catch((err) => {
                        if (process.env.NODE_ENV !== 'test') {
                            console.warn('RLS release reset app.tenant_id failed:', err.message);
                        }
                        origRelease(connection);
                    });
            } else {
                origRelease(connection);
            }
        };
    }
}

module.exports = { initRlsSession };
