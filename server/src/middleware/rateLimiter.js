/**
 * Rate Limiting Middleware
 * Redis-backed store so limits apply across multiple API instances.
 * Keys: route group + IP + (userId if authenticated) + (tenantId when available).
 */
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisService = require('../services/redisService');

const client = redisService.getRedisClient();

/**
 * Create a Redis store for one limiter (each limiter must have its own store with unique prefix).
 */
function createRedisStore(keyPrefix) {
    if (!client) return undefined;
    return new RedisStore({
        sendCommand: (...args) => client.sendCommand(args),
        prefix: `rl:${keyPrefix}:`
    });
}

/**
 * Key generator: routeGroup + IP (via ipKeyGenerator) + userId (if auth) + tenantId (when available).
 */
function keyGenerator(routeGroup) {
    return (req) => {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const safeIp = ipKeyGenerator(ip, 56);
        const userId = req.userId || (req.user && req.user.id) || '';
        const tenantId = req.tenantId || '';
        return [routeGroup, safeIp, userId, tenantId].filter(Boolean).join(':');
    };
}

function createLimiter(options) {
    const { keyPrefix, windowMs, max, message, skipSuccessfulRequests, skip } = options;
    const store = createRedisStore(keyPrefix);
    return rateLimit({
        windowMs,
        max,
        message: message || { success: false, message: 'Too many requests, please try again later.' },
        standardHeaders: true,
        legacyHeaders: false,
        ...(store && { store }),
        keyGenerator: keyGenerator(keyPrefix),
        ...(skipSuccessfulRequests !== undefined && { skipSuccessfulRequests }),
        ...(skip && { skip })
    });
}

/** General API: 1000 per 15 min per IP (and userId/tenantId when set). */
const generalLimiter = createLimiter({
    keyPrefix: 'general',
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});

/** Auth: 5 attempts per 15 min per IP. */
const authLimiter = createLimiter({
    keyPrefix: 'auth',
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' },
    skipSuccessfulRequests: true
});

/** Password reset: 3 per hour per IP. */
const passwordResetLimiter = createLimiter({
    keyPrefix: 'passwordReset',
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { success: false, message: 'Too many password reset attempts. Please try again later.' },
    skipSuccessfulRequests: true
});

/** Payment: 10 per 30 min per user (userId in key when authenticated). */
const paymentLimiter = createLimiter({
    keyPrefix: 'payment',
    windowMs: 30 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many payment attempts. Please try again later.' }
});

/** Email verification: 5 per hour per IP. */
const emailVerificationLimiter = createLimiter({
    keyPrefix: 'emailVerify',
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many email verification attempts. Please try again later.' },
    skipSuccessfulRequests: true
});

/** Phone verification: 5 per hour. */
const phoneVerificationLimiter = createLimiter({
    keyPrefix: 'phoneVerify',
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many phone verification attempts. Please try again later.' },
    skip: (req, res) => res.statusCode < 400
});

/** Upload: 20 per hour. */
const uploadLimiter = createLimiter({
    keyPrefix: 'upload',
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many file uploads. Please try again later.' }
});

/**
 * Create endpoint-specific rate limiter.
 * @param {number} maxRequests - max requests per window
 * @param {number} windowMs - window in ms
 * @param {string} [keyPrefix] - optional key prefix (default 'custom')
 */
function createCustomLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000, keyPrefix = 'custom') {
    return createLimiter({
        keyPrefix,
        windowMs,
        max: maxRequests,
        message: { success: false, message: 'Too many requests. Please try again later.' }
    });
}

module.exports = {
    generalLimiter,
    authLimiter,
    passwordResetLimiter,
    paymentLimiter,
    emailVerificationLimiter,
    phoneVerificationLimiter,
    uploadLimiter,
    createLimiter: createCustomLimiter,
    keyGenerator,
    createRedisStore
};
