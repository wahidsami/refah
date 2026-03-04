/**
 * Periodic DB pool metrics logging (active/idle/wait).
 * Non-prod: logs by default. Prod: only when DB_POOL_METRICS_LOG=1.
 * Interval: DB_POOL_METRICS_INTERVAL_MS (default 60000).
 */

const INTERVAL_MS = parseInt(process.env.DB_POOL_METRICS_INTERVAL_MS || '60000', 10);
const ENABLED = process.env.DB_POOL_METRICS_LOG === '1' || process.env.NODE_ENV !== 'production';

function startPoolMetricsLogger(sequelize) {
    if (!sequelize || !ENABLED) return null;

    const timer = setInterval(() => {
        try {
            const pool = sequelize.connectionManager && sequelize.connectionManager.pool;
            if (pool && typeof pool.size === 'number' && typeof pool.available === 'number') {
                const active = pool.size - pool.available;
                const idle = pool.available;
                const pending = typeof pool.pending === 'number' ? pool.pending : 0;
                console.log(JSON.stringify({
                    event: 'db_pool_metrics',
                    size: pool.size,
                    active,
                    idle,
                    pending
                }));
            }
        } catch (_) {
            // ignore
        }
    }, INTERVAL_MS);

    return () => clearInterval(timer);
}

module.exports = { startPoolMetricsLogger };
