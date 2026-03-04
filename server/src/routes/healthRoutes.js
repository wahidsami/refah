/**
 * Liveness, readiness, and Prometheus metrics.
 * /health - process alive (200)
 * /ready - DB + Redis OK (200) or 503
 * /metrics - Prometheus text format (request count, latency, booking conflicts, redis lock failures, optional DB pool)
 */

const express = require('express');
const router = express.Router();
const db = require('../models');
const redisService = require('../services/redisService');
const metrics = require('../utils/metrics');

router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

router.get('/metrics', (req, res) => {
    try {
        const pool = db.sequelize && db.sequelize.connectionManager && db.sequelize.connectionManager.pool;
        if (pool && typeof pool.size === 'number' && typeof pool.available === 'number') {
            metrics.setDbPoolSnapshot({
                size: pool.size,
                available: pool.available,
                pending: typeof pool.pending === 'number' ? pool.pending : undefined
            });
        } else {
            metrics.setDbPoolSnapshot(null);
        }
    } catch (_) {
        metrics.setDbPoolSnapshot(null);
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(metrics.render());
});

router.get('/ready', async (req, res) => {
    let dbOk = false;
    let redisOk = false;
    try {
        await db.sequelize.authenticate();
        dbOk = true;
    } catch (e) {
        // dbOk stays false
    }
    try {
        redisOk = await redisService.ping();
    } catch (e) {
        // redisOk stays false
    }
    const ok = dbOk && redisOk;
    res.status(ok ? 200 : 503).json({
        status: ok ? 'ready' : 'not ready',
        db: dbOk ? 'ok' : 'error',
        redis: redisOk ? 'ok' : 'error'
    });
});

module.exports = router;
