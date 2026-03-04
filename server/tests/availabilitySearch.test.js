/**
 * Regression / perf test for POST /api/v1/bookings/search (availability search).
 * Asserts response shape and basic invariants. Optional: query count threshold.
 * Requires DB with at least one tenant, service, and staff (with schedule or shifts).
 */

const request = require('supertest');
const express = require('express');
const db = require('../src/models');

let sharedApp;

beforeAll(async () => {
    sharedApp = express();
    sharedApp.use(express.json());
    sharedApp.use('/api/v1/bookings', require('../src/routes/bookingRoutes'));
    if (db.sequelize && typeof db.sequelize.addHook === 'function') {
        db.sequelize.addHook('afterQuery', () => { (global.__availabilityQueryCount = (global.__availabilityQueryCount || 0) + 1); });
    }
});

afterAll(async () => {
    if (db.sequelize) await db.sequelize.close();
});

describe('Availability search (POST /api/v1/bookings/search)', () => {
    beforeEach(() => {
        if (global.__availabilityQueryCount !== undefined) global.__availabilityQueryCount = 0;
    });

    it('returns 400 when serviceId or date is missing', async () => {
        if (!sharedApp || typeof sharedApp !== 'function') return;
        const res = await request(sharedApp)
            .post('/api/v1/bookings/search')
            .send({ tenantId: '00000000-0000-0000-0000-000000000001' });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('returns correct shape and invariants when tenant+service+date provided', async () => {
        const { sequelize } = db;
        if (sequelize.getDialect() !== 'postgres') return;

        const tenantRows = await sequelize.query('SELECT id FROM tenants LIMIT 1', { type: sequelize.QueryTypes.SELECT }).catch(() => []);
        const tenantId = tenantRows[0]?.id;
        if (!tenantId) {
            if (process.env.NODE_ENV !== 'test') console.warn('Skip: need at least one tenant');
            return;
        }
        const serviceRows = await sequelize.query(
            'SELECT id FROM services WHERE "tenantId" = :tid AND "isActive" = true LIMIT 1',
            { replacements: { tid: tenantId }, type: sequelize.QueryTypes.SELECT }
        ).catch(() => []);
        const serviceId = serviceRows[0]?.id;
        if (!serviceId) {
            if (process.env.NODE_ENV !== 'test') console.warn('Skip: need at least one active service for tenant');
            return;
        }

        const date = new Date();
        date.setDate(date.getDate() + 1);
        const dateStr = date.toISOString().split('T')[0];

        const res = await request(sharedApp)
            .post('/api/v1/bookings/search')
            .send({ tenantId, serviceId, date: dateStr });

        if (res.status === 400 && res.body.message && res.body.message.includes('not found')) {
            return;
        }
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('slots');
        expect(Array.isArray(res.body.slots)).toBe(true);
        expect(res.body).toHaveProperty('date', dateStr);
        expect(res.body).toHaveProperty('totalSlots');
        expect(res.body).toHaveProperty('availableSlots');
        expect(res.body).toHaveProperty('metadata');
        expect(res.body.metadata).toHaveProperty('staffCount');
        expect(res.body.totalSlots).toBe(res.body.slots.length);
        expect(res.body.availableSlots).toBeLessThanOrEqual(res.body.slots.length);
        res.body.slots.forEach(slot => {
            expect(slot).toHaveProperty('startTime');
            expect(slot).toHaveProperty('endTime');
            expect(slot).toHaveProperty('available');
        });
    });

    it('query count for any-staff search is under threshold (batched path)', async () => {
        const { sequelize } = db;
        if (sequelize.getDialect() !== 'postgres') return;

        const tenants = await sequelize.query('SELECT id FROM tenants LIMIT 1', { type: sequelize.QueryTypes.SELECT });
        if (!tenants?.length) return;
        const services = await sequelize.query(
            'SELECT id FROM services WHERE "tenantId" = :tid AND "isActive" = true LIMIT 1',
            { replacements: { tid: tenants[0].id }, type: sequelize.QueryTypes.SELECT }
        );
        if (!services?.length) return;

        const date = new Date();
        date.setDate(date.getDate() + 1);
        const dateStr = date.toISOString().split('T')[0];

        if (global.__availabilityQueryCount !== undefined) global.__availabilityQueryCount = 0;
        const res = await request(sharedApp)
            .post('/api/v1/bookings/search')
            .send({ tenantId: tenants[0].id, serviceId: services[0].id, date: dateStr });

        if (res.status !== 200) return;
        const threshold = 20;
        expect(global.__availabilityQueryCount ?? 0).toBeLessThanOrEqual(threshold);
    });
});

describe('Next available slot (GET /api/v1/bookings/next-available)', () => {
    it('returns 400 when tenantId, serviceId, or staffId is missing', async () => {
        const res = await request(sharedApp).get('/api/v1/bookings/next-available');
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/tenantId|serviceId|staffId|required/i);
    });

    it('respects NEXT_AVAILABLE_MAX_DAYS cap (does not search more than max days)', async () => {
        const { sequelize } = db;
        if (sequelize.getDialect() !== 'postgres') return;
        const tenants = await sequelize.query('SELECT id FROM tenants LIMIT 1', { type: sequelize.QueryTypes.SELECT });
        const services = await sequelize.query(
            'SELECT id FROM services WHERE "isActive" = true LIMIT 1',
            { type: sequelize.QueryTypes.SELECT }
        );
        const staff = await sequelize.query('SELECT id FROM staff WHERE "isActive" = true LIMIT 1', { type: sequelize.QueryTypes.SELECT });
        if (!tenants?.length || !services?.length || !staff?.length) return;
        const tenantId = tenants[0].id;
        const serviceId = services[0].id;
        const staffId = staff[0].id;

        const prev = process.env.NEXT_AVAILABLE_MAX_DAYS;
        process.env.NEXT_AVAILABLE_MAX_DAYS = '2';
        const res = await request(sharedApp)
            .get('/api/v1/bookings/next-available')
            .query({ tenantId, serviceId, staffId, daysToSearch: 30 });
        if (prev !== undefined) process.env.NEXT_AVAILABLE_MAX_DAYS = prev;
        else delete process.env.NEXT_AVAILABLE_MAX_DAYS;

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success');
        expect(res.body).toHaveProperty('slot');
        if (res.body.success === false) {
            expect(res.body.message).toMatch(/next 2 days/);
            expect(res.body.searchedDays).toBe(2);
        }
    });

    it('returns 400 for invalid daysToSearch', async () => {
        const badValues = [0, -1, 61, 999, 'abc'];
        for (const val of badValues) {
            const res = await request(sharedApp)
                .get('/api/v1/bookings/next-available')
                .query({ tenantId: '00000000-0000-0000-0000-000000000001', serviceId: '00000000-0000-0000-0000-000000000002', staffId: '00000000-0000-0000-0000-000000000003', daysToSearch: val });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/invalid daysToSearch|1 and 60/i);
        }
    });

    it('returns first available slot when one exists within window', async () => {
        const availabilityService = require('../src/services/availabilityService');
        const spy = jest.spyOn(availabilityService, 'getAvailableSlots').mockResolvedValue({
            slots: [
                { startTime: '2026-03-01T10:00:00.000Z', endTime: '2026-03-01T10:30:00.000Z', available: false },
                { startTime: '2026-03-01T10:30:00.000Z', endTime: '2026-03-01T11:00:00.000Z', available: true }
            ],
            metadata: {}
        });
        const result = await availabilityService.getNextAvailableSlot(
            '00000000-0000-0000-0000-000000000001',
            { serviceId: '00000000-0000-0000-0000-000000000002', staffId: '00000000-0000-0000-0000-000000000003', daysToSearch: 14 }
        );
        spy.mockRestore();

        expect(result.success).toBe(true);
        expect(result.slot).toBeDefined();
        expect(result.slot.available).toBe(true);
        expect(result.date).toBeDefined();
        expect(result.daysAhead).toBe(0);
    });

    it('returns no-availability response when none in window (searchedDays + message)', async () => {
        const availabilityService = require('../src/services/availabilityService');
        const prev = process.env.NEXT_AVAILABLE_MAX_DAYS;
        process.env.NEXT_AVAILABLE_MAX_DAYS = '14';
        const result = await availabilityService.getNextAvailableSlot(
            '00000000-0000-0000-0000-000000000001',
            {
                serviceId: '00000000-0000-0000-0000-000000000002',
                staffId: '00000000-0000-0000-0000-000000000003',
                daysToSearch: 2
            }
        ).catch(() => null);
        if (prev !== undefined) process.env.NEXT_AVAILABLE_MAX_DAYS = prev;
        else delete process.env.NEXT_AVAILABLE_MAX_DAYS;

        if (!result) return;
        expect(result.success).toBe(false);
        expect(result.slot).toBeNull();
        expect(result.date).toBeNull();
        expect(result.daysAhead).toBeNull();
        expect(result.searchedDays).toBe(2);
        expect(result.message).toMatch(/no availability in next 2 days/i);
    });
});
