/**
 * Tests for /health (liveness) and /ready (readiness) endpoints.
 */

const request = require('supertest');
const express = require('express');
const db = require('../src/models');
const redisService = require('../src/services/redisService');

jest.mock('../src/models', () => ({
    sequelize: {
        authenticate: jest.fn()
    }
}));
jest.mock('../src/services/redisService', () => ({
    ping: jest.fn()
}));

const healthRoutes = require('../src/routes/healthRoutes');

describe('Health endpoints', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(healthRoutes);
    });

    describe('GET /health', () => {
        it('returns 200 and status ok when process is alive', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: 'ok' });
        });
    });

    describe('GET /ready', () => {
        it('returns 200 when DB and Redis are OK', async () => {
            db.sequelize.authenticate.mockResolvedValue(undefined);
            redisService.ping.mockResolvedValue(true);

            const res = await request(app).get('/ready');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ready');
            expect(res.body.db).toBe('ok');
            expect(res.body.redis).toBe('ok');
        });

        it('returns 503 when DB fails', async () => {
            db.sequelize.authenticate.mockRejectedValue(new Error('Connection refused'));
            redisService.ping.mockResolvedValue(true);

            const res = await request(app).get('/ready');
            expect(res.status).toBe(503);
            expect(res.body.status).toBe('not ready');
            expect(res.body.db).toBe('error');
            expect(res.body.redis).toBe('ok');
        });

        it('returns 503 when Redis fails', async () => {
            db.sequelize.authenticate.mockResolvedValue(undefined);
            redisService.ping.mockResolvedValue(false);

            const res = await request(app).get('/ready');
            expect(res.status).toBe(503);
            expect(res.body.status).toBe('not ready');
            expect(res.body.db).toBe('ok');
            expect(res.body.redis).toBe('error');
        });

        it('returns 503 when both DB and Redis fail', async () => {
            db.sequelize.authenticate.mockRejectedValue(new Error('DB down'));
            redisService.ping.mockResolvedValue(false);

            const res = await request(app).get('/ready');
            expect(res.status).toBe(503);
            expect(res.body.db).toBe('error');
            expect(res.body.redis).toBe('error');
        });
    });
});
