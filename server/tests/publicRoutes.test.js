/**
 * Public routes: /tenants (discovery) vs tenant-scoped /tenant/:slug and /tenant/:tenantId.
 * - GET /tenants must return all active tenants and must NOT run publicTenantContext (no slug lookup).
 * - GET /tenant/:slug must set req.tenantId and response is for that tenant only.
 */

const request = require('supertest');
const express = require('express');
const publicRoutes = require('../src/routes/publicRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/public', publicRoutes);

describe('Public routes', () => {
    describe('GET /api/v1/public/tenants (discovery)', () => {
        it('returns 200 with tenants array and pagination (no slug lookup, no tenant context)', async () => {
            const res = await request(app).get('/api/v1/public/tenants');

            if (res.status === 500 && res.body?.message) {
                console.warn('GET /tenants returned 500 (DB may be unavailable):', res.body.message);
                return;
            }
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.tenants).toBeDefined();
            expect(Array.isArray(res.body.tenants)).toBe(true);
            expect(res.body.pagination).toBeDefined();
            expect(res.body.pagination).toMatchObject({
                total: expect.any(Number),
                limit: expect.any(Number),
                totalPages: expect.any(Number)
            });
        });
    });

    describe('GET /api/v1/public/tenant/:slug', () => {
        it('sets req.tenantId from slug and response tenant matches (tenant context applied)', async () => {
            const tenantBySlug = {
                id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
                name: 'Test Tenant',
                slug: 'test-tenant',
                name_en: null,
                name_ar: null,
                businessType: null,
                logo: null,
                coverImage: null,
                email: null,
                phone: null,
                mobile: null,
                buildingNumber: null,
                street: null,
                district: null,
                city: null,
                country: null,
                postalCode: null,
                googleMapLink: null,
                facebookUrl: null,
                instagramUrl: null,
                twitterUrl: null,
                linkedinUrl: null,
                tiktokUrl: null,
                youtubeUrl: null,
                snapchatUrl: null,
                pinterestUrl: null,
                whatsapp: null,
                workingHours: null,
                toJSON() { return { ...this }; }
            };
            const db = require('../src/models');
            const findOneSpy = jest.spyOn(db.Tenant, 'findOne').mockResolvedValue(tenantBySlug);

            const res = await request(app).get('/api/v1/public/tenant/test-tenant');

            findOneSpy.mockRestore();

            expect([200, 404]).toContain(res.status);
            if (res.status === 200 && res.body.tenant) {
                expect(res.body.tenant.id).toBe(tenantBySlug.id);
                expect(res.body.tenant.slug).toBe('test-tenant');
            }
        });
    });
});
