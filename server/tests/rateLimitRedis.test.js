/**
 * Rate limiter: two app instances sharing the same Redis-backed store
 * should share counters (limit applies across instances).
 */
const request = require('supertest');
const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('redis');

const WINDOW_MS = 60 * 1000;
const MAX = 3;
const SHARED_IP = '192.168.1.100';

function keyGenerator(routeGroup) {
    return (req) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
        const safeIp = ipKeyGenerator(ip, 56);
        const userId = req.userId || (req.user && req.user.id) || '';
        const tenantId = req.tenantId || '';
        return [routeGroup, safeIp, userId, tenantId].filter(Boolean).join(':');
    };
}

async function createAppWithLimiter(redisClient) {
    const store = new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: 'rl-test:'
    });
    const app = express();
    app.set('trust proxy', 1);
    app.use(express.json());
    app.use(
        rateLimit({
            windowMs: WINDOW_MS,
            max: MAX,
            store,
            keyGenerator: keyGenerator('test'),
            standardHeaders: true,
            legacyHeaders: false,
            message: { success: false, message: 'Too many requests.' }
        })
    );
    app.get('/ping', (req, res) => res.json({ ok: true }));
    return app;
}

describe('Rate limiter Redis store (shared across instances)', () => {
    let client;
    let app1;
    let app2;

    beforeAll(async () => {
        const url = process.env.REDIS_URL || 'redis://localhost:6379';
        client = redis.createClient({ url });
        try {
            await client.connect();
        } catch (e) {
            console.warn('Redis not available, skipping rate limit Redis tests:', e.message);
            return;
        }
        app1 = await createAppWithLimiter(client);
        app2 = await createAppWithLimiter(client);
    }, 10000);

    afterAll(async () => {
        if (client) {
            try {
                await client.quit();
            } catch (e) {}
        }
    });

    it('two instances share the same counter (second instance sees limit from first)', async () => {
        if (!client || !app1 || !app2) return;
        const opts = () => ({ headers: { 'x-forwarded-for': SHARED_IP } });

        // Exhaust limit via app1
        for (let i = 0; i < MAX; i++) {
            const res = await request(app1).get('/ping').set(opts().headers);
            expect(res.status).toBe(200);
        }
        const overRes1 = await request(app1).get('/ping').set(opts().headers);
        expect(overRes1.status).toBe(429);

        // Same key on app2 should also be limited
        const res2 = await request(app2).get('/ping').set(opts().headers);
        expect(res2.status).toBe(429);
    });
});
