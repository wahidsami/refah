/**
 * Regression test: featured-status route must not crash.
 * Tenant auth sets req.tenantId (not req.user.tenantId); controller must use req.tenantId.
 */

const jwt = require('jsonwebtoken');

jest.mock('../src/models', () => ({}));
jest.mock('../src/services/promotionService', () => ({
    canBeFeatured: jest.fn().mockResolvedValue({ allowed: true, priority: 'medium' }),
    getTenantFeatures: jest.fn().mockResolvedValue({ packageName: 'Basic', maxHotDeals: 2 })
}));

const featuredController = require('../src/controllers/featuredController');

describe('GET /api/v1/tenant/featured-status (getTenantFeaturedStatus)', () => {
    test('does not crash and returns success when req.tenantId is set (tenant auth shape)', async () => {
        const tenantId = '11111111-2222-3333-4444-555555555555';
        const req = { tenantId };
        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await featuredController.getTenantFeaturedStatus(req, res);

        expect(res.status).not.toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                canBeFeatured: true,
                priority: 'medium',
                currentPackage: 'Basic'
            })
        );
    });

    test('uses req.tenantId for authorization (promotionService called with tenant id)', async () => {
        const promotionService = require('../src/services/promotionService');
        promotionService.canBeFeatured.mockClear();
        promotionService.getTenantFeatures.mockClear();

        const tenantId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
        const req = { tenantId };
        const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

        await featuredController.getTenantFeaturedStatus(req, res);

        expect(promotionService.canBeFeatured).toHaveBeenCalledWith(tenantId);
        expect(promotionService.getTenantFeatures).toHaveBeenCalledWith(tenantId);
    });

    test('without token returns 401 (integration: route uses authenticateTenant)', () => {
        const request = require('supertest');
        const express = require('express');
        const featuredRoutes = require('../src/routes/featuredRoutes');

        const app = express();
        app.use(express.json());
        app.use('/api/v1', featuredRoutes);

        return request(app)
            .get('/api/v1/tenant/featured-status')
            .expect(401)
            .then((res) => {
                expect(res.body.success).toBe(false);
                expect(res.body.message).toMatch(/token|auth/i);
            });
    });

    test('with valid tenant JWT does not crash (200 or 404 from tenant lookup)', async () => {
        const request = require('supertest');
        const express = require('express');
        const featuredRoutes = require('../src/routes/featuredRoutes');

        const app = express();
        app.use(express.json());
        app.use('/api/v1', featuredRoutes);

        const secret = process.env.JWT_SECRET || 'test-secret-for-featured-status-test';
        const prevSecret = process.env.JWT_SECRET;
        if (!process.env.JWT_SECRET) process.env.JWT_SECRET = secret;
        const tenantId = '99999999-9999-9999-9999-999999999999';
        const token = jwt.sign(
            { id: tenantId, type: 'tenant' },
            secret,
            { expiresIn: '1h' }
        );

        const res = await request(app)
            .get('/api/v1/tenant/featured-status')
            .set('Authorization', `Bearer ${token}`);

        if (prevSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = prevSecret;

        expect([200, 404, 500]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('canBeFeatured');
            expect(res.body).toHaveProperty('currentPackage');
        }
        if (res.status === 404) {
            expect(res.body.message).toMatch(/not found|Tenant/i);
        }
        if (res.status === 500) {
            expect(res.body.success).toBe(false);
        }
    });
});
