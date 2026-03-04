/**
 * Attach a request ID to each request for tracing in logs.
 * Uses incoming X-Request-Id header if present, otherwise generates a new UUID.
 */

const crypto = require('crypto');

const REQUEST_ID_HEADER = 'x-request-id';

function requestIdMiddleware(req, res, next) {
    const id = req.headers[REQUEST_ID_HEADER] || crypto.randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
}

module.exports = requestIdMiddleware;
