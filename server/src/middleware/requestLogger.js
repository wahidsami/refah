/**
 * Structured request logging (JSON).
 * Logs request start, request end with latency, status code, requestId, tenantId, userId, route.
 */

function requestLogger(req, res, next) {
    const start = Date.now();
    const requestId = req.requestId || null;
    const route = req.originalUrl || req.url || '';
    const method = req.method || '';

    const startPayload = {
        event: 'request_start',
        requestId,
        method,
        route
    };
    console.log(JSON.stringify(startPayload));

    res.on('finish', () => {
        const latencyMs = Date.now() - start;
        const userId = req.userId ?? (req.user && req.user.id) ?? null;
        const tenantId = req.tenantId ?? null;

        const endPayload = {
            event: 'request_end',
            requestId,
            method,
            route,
            statusCode: res.statusCode,
            latencyMs,
            ...(tenantId != null && { tenantId }),
            ...(userId != null && { userId })
        };
        console.log(JSON.stringify(endPayload));
    });

    next();
}

module.exports = requestLogger;
