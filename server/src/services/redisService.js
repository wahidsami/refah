/**
 * Redis Service
 * Handles Redis operations for locking and caching
 */

let redisClient = null;

/**
 * Initialize Redis client
 */
function initRedis() {
    try {
        const redis = require('redis');
        const client = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });

        client.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });

        client.on('connect', () => {
            console.log('✅ Redis connected');
        });

        client.connect().catch(console.error);
        redisClient = client;
        return client;
    } catch (error) {
        console.warn('Redis not available:', error.message);
        return null;
    }
}

/**
 * Get Redis client (lazy initialization)
 */
function getRedisClient() {
    if (!redisClient) {
        redisClient = initRedis();
    }
    return redisClient;
}

/** Error code when Redis is down or lock call fails (fail closed → 503) */
const REDIS_UNAVAILABLE = 'REDIS_UNAVAILABLE';

/**
 * Acquire a lock for a booking slot.
 * Fail closed: if Redis is unavailable or errors, throws (do not proceed with booking).
 * @param {string} key - Lock key (e.g., "booking:staffId:startTime")
 * @param {number} ttl - Time to live in seconds (default 300 = 5 minutes)
 * @returns {Promise<boolean>} - true if lock acquired, false if already locked
 * @throws {Error} with code REDIS_UNAVAILABLE if Redis unavailable or on Redis error
 */
async function acquireLock(key, ttl = 300) {
    const client = getRedisClient();
    if (!client) {
        const err = new Error('Redis unavailable');
        err.code = REDIS_UNAVAILABLE;
        throw err;
    }

    try {
        const lockKey = `lock:${key}`;
        const result = await client.setNX(lockKey, '1');
        if (result) {
            await client.expire(lockKey, ttl);
            return true;
        }
        try {
            require('../utils/metrics').recordRedisLockFailure('contention');
        } catch (_) { /* metrics optional */ }
        return false;
    } catch (error) {
        try {
            require('../utils/metrics').recordRedisLockFailure('error');
        } catch (_) { /* metrics optional */ }
        console.error('Redis lock error:', error);
        const err = new Error('Redis lock error');
        err.code = REDIS_UNAVAILABLE;
        err.cause = error;
        throw err;
    }
}

/**
 * Release a lock
 * @param {string} key - Lock key
 */
async function releaseLock(key) {
    const client = getRedisClient();
    if (!client) return;

    try {
        const lockKey = `lock:${key}`;
        await client.del(lockKey);
    } catch (error) {
        console.error('Redis unlock error:', error);
    }
}

/**
 * Get lock status
 * @param {string} key - Lock key
 * @returns {Promise<boolean>} - true if locked, false if available
 */
async function isLocked(key) {
    const client = getRedisClient();
    if (!client) return false;

    try {
        const lockKey = `lock:${key}`;
        const exists = await client.exists(lockKey);
        return exists === 1;
    } catch (error) {
        console.error('Redis check lock error:', error);
        return false;
    }
}

/**
 * Ping Redis (for readiness checks).
 * @returns {Promise<boolean>} true if ping succeeded
 */
async function ping() {
    const client = getRedisClient();
    if (!client) return false;
    try {
        await client.ping();
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Close Redis connection (for graceful shutdown).
 * @returns {Promise<void>}
 */
async function close() {
    if (!redisClient) return;
    try {
        await redisClient.quit();
    } catch (error) {
        console.error('Redis close error:', error);
    } finally {
        redisClient = null;
    }
}

module.exports = {
    initRedis,
    getRedisClient,
    acquireLock,
    releaseLock,
    isLocked,
    ping,
    close,
    REDIS_UNAVAILABLE
};

