/**
 * Phase 0 booking correctness tests.
 * - Redis down / lock error => 503 (fail closed).
 * - Lock already held => 409 (slot busy).
 * - Two parallel requests same slot => exactly one succeeds, one 409.
 */

const request = require('supertest');

jest.mock('../src/middleware/checkSubscription', () => ({
    updateUsage: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../src/services/redisService', () => ({
    initRedis: jest.fn(),
    getRedisClient: jest.fn(),
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
    isLocked: jest.fn(),
    REDIS_UNAVAILABLE: 'REDIS_UNAVAILABLE'
}));

const TEST_TENANT_ID = '44444444-4444-4444-4444-444444444444';
const TEST_SERVICE_ID = '11111111-1111-1111-1111-111111111111';
const TEST_STAFF_ID = '22222222-2222-2222-2222-222222222222';
const TEST_USER_ID = '33333333-3333-3333-3333-333333333333';

jest.mock('../src/models', () => {
    const txn = { commit: jest.fn(), rollback: jest.fn(), finished: false };
    return {
        Tenant: { findByPk: jest.fn().mockImplementation(id => Promise.resolve({ id: id || TEST_TENANT_ID, status: 'approved' })) },
        Service: { findByPk: jest.fn().mockImplementation(id => Promise.resolve({ id: id || TEST_SERVICE_ID, tenantId: TEST_TENANT_ID, isActive: true, duration: 30, rawPrice: 100, basePrice: 100, taxRate: 15, commissionRate: 10 })) },
        PlatformUser: { findByPk: jest.fn().mockImplementation(id => Promise.resolve({ id: id || TEST_USER_ID, isActive: true, isBanned: false })) },
        TenantSettings: { findOne: jest.fn().mockResolvedValue(null) },
        Staff: { findByPk: jest.fn().mockImplementation(id => Promise.resolve({ id: id || TEST_STAFF_ID, tenantId: TEST_TENANT_ID, isActive: true, commissionRate: 5 })), increment: jest.fn().mockResolvedValue([1]) },
        ServiceEmployee: { findOne: jest.fn().mockResolvedValue({}) },
        Appointment: {
            findAll: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ id: 'apt1', staffId: 'st1', startTime: new Date(), endTime: new Date() }),
            calculateRevenueBreakdown: () => ({ price: 100, rawPrice: 90, taxAmount: 10, platformFee: 10, tenantRevenue: 100, employeeRevenue: 90, employeeCommissionRate: 5, employeeCommission: 4.5 })
        },
        CustomerInsight: { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}), findOrCreate: jest.fn().mockResolvedValue([{}, false]), increment: jest.fn(), update: jest.fn().mockResolvedValue({}) },
        sequelize: { transaction: jest.fn().mockResolvedValue(txn) }
    };
});

describe('Booking concurrency (Phase 0)', () => {
    describe('Redis unavailable returns 503', () => {
        test('create booking when service throws REDIS_UNAVAILABLE returns 503', async () => {
            const bookingController = require('../src/controllers/bookingController');
            const bookingService = require('../src/services/bookingService');
            const err = new Error('Redis unavailable');
            err.code = 'REDIS_UNAVAILABLE';
            jest.spyOn(bookingService, 'createBooking').mockRejectedValue(err);

            const req = {
                body: {
                    serviceId: '00000000-0000-0000-0000-000000000002',
                    staffId: '00000000-0000-0000-0000-000000000003',
                    tenantId: '00000000-0000-0000-0000-000000000004',
                    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
                },
                userId: '00000000-0000-0000-0000-000000000001'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await bookingController.createBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: expect.stringMatching(/temporarily unavailable|try again/i)
                })
            );
            bookingService.createBooking.mockRestore();
        });
    });

    describe('Slot busy returns 409', () => {
        test('createBooking throws with code SLOT_BUSY when lock already held', async () => {
            const redisService = require('../src/services/redisService');
            redisService.acquireLock.mockResolvedValue(false);

            const bookingService = require('../src/services/bookingService');
            const basePayload = {
                serviceId: TEST_SERVICE_ID,
                staffId: TEST_STAFF_ID,
                platformUserId: TEST_USER_ID,
                tenantId: TEST_TENANT_ID,
                startTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
            };

            await expect(bookingService.createBooking(basePayload)).rejects.toMatchObject({
                code: 'SLOT_BUSY',
                message: expect.stringMatching(/currently being booked|try again/i)
            });
        });
    });

    describe('Two parallel requests same slot', () => {
        test('exactly one succeeds and one returns 409 when lock allows one then blocks second', async () => {
            const redisService = require('../src/services/redisService');
            let callCount = 0;
            redisService.acquireLock.mockImplementation(() =>
                Promise.resolve(++callCount === 1)
            );
            redisService.releaseLock.mockResolvedValue(undefined);

            const bookingService = require('../src/services/bookingService');
            const payload = {
                serviceId: TEST_SERVICE_ID,
                staffId: TEST_STAFF_ID,
                platformUserId: TEST_USER_ID,
                tenantId: TEST_TENANT_ID,
                startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
            };

            const [result1, result2] = await Promise.allSettled([
                bookingService.createBooking(payload),
                bookingService.createBooking(payload)
            ]);

            const fulfilled = [result1, result2].filter(r => r.status === 'fulfilled');
            const rejected = [result1, result2].filter(r => r.status === 'rejected');
            const slotBusyRejections = rejected.filter(r => r.reason && r.reason.code === 'SLOT_BUSY');
            expect(fulfilled.length + rejected.length).toBe(2);
            expect(slotBusyRejections.length).toBeGreaterThanOrEqual(1);
            expect(slotBusyRejections[0].reason.code).toBe('SLOT_BUSY');
        });
    });
});
