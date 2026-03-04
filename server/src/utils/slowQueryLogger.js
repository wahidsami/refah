/**
 * Slow-query logger for Sequelize.
 * Logs queries exceeding SLOW_QUERY_MS (default 200ms).
 * In production, enable with SLOW_QUERY_LOG_ENABLED=1; in non-prod, always logs slow queries.
 */

const SLOW_QUERY_MS = parseInt(process.env.SLOW_QUERY_MS || '200', 10);
const ENABLED_IN_PROD = process.env.SLOW_QUERY_LOG_ENABLED === '1';

function initSlowQueryLogger(sequelize) {
    if (!sequelize || sequelize.getDialect?.() !== 'postgres') return;

    const isProd = process.env.NODE_ENV === 'production';
    if (isProd && !ENABLED_IN_PROD) return;

    sequelize.options.benchmark = true;
    const prevLogging = sequelize.options.logging;
    sequelize.options.logging = (message, benchmarkMs) => {
        const ms = typeof benchmarkMs === 'number' ? benchmarkMs : 0;
        if (ms >= SLOW_QUERY_MS) {
            const preview = typeof message === 'string' ? message.slice(0, 200) : String(message).slice(0, 200);
            console.warn(JSON.stringify({
                event: 'slow_query',
                ms,
                threshold: SLOW_QUERY_MS,
                queryPreview: preview
            }));
        }
        if (typeof prevLogging === 'function') {
            prevLogging(message, benchmarkMs);
        }
    };
}

module.exports = { initSlowQueryLogger };
