/**
 * Global Express error-handling middleware.
 * Consistent JSON error response; no stack trace in production; logs requestId + tenantId.
 */

function errorHandler(err, req, res, next) {
    const requestId = req.requestId || null;
    const tenantId = req.tenantId || null;
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal server error';

    const logPayload = {
        requestId,
        tenantId,
        message: err.message,
        statusCode
    };
    if (process.env.NODE_ENV !== 'production') {
        logPayload.stack = err.stack;
    }
    console.error('[errorHandler]', JSON.stringify(logPayload));

    const body = {
        success: false,
        message: process.env.NODE_ENV === 'production' ? message : message
    };
    if (requestId) body.requestId = requestId;
    if (process.env.NODE_ENV !== 'production' && err.stack) body.stack = err.stack;

    res.status(statusCode).json(body);
}

module.exports = errorHandler;
