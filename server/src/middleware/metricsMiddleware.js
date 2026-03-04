/**
 * Records request count and latency for Prometheus metrics.
 * Attach after requestLogger so route/status are final.
 */

const metrics = require('../utils/metrics');

function metricsMiddleware(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const route = req.originalUrl || req.url || '';
        const method = req.method || 'GET';
        const status = res.statusCode;
        const latencyMs = Date.now() - start;
        metrics.recordRequest(method, route, status, latencyMs);
    });
    next();
}

module.exports = metricsMiddleware;
