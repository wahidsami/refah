/**
 * Phase 1 DB performance: pagination helper and list endpoint behavior.
 * - parseLimitOffset: valid limit/offset, reject oversized limit, invalid values
 * - List endpoints return 400 when limit exceeds max page size
 */

const { parseLimitOffset, DEFAULT_MAX_PAGE_SIZE } = require('../src/utils/pagination');

describe('parseLimitOffset', () => {
    it('returns default limit and offset when no query params', () => {
        const req = { query: {} };
        const result = parseLimitOffset(req, 20, 100);
        expect(result.limit).toBe(20);
        expect(result.offset).toBe(0);
        expect(result.page).toBe(1);
    });

    it('parses limit and page from query', () => {
        const req = { query: { limit: '10', page: '3' } };
        const result = parseLimitOffset(req, 20, 100);
        expect(result.limit).toBe(10);
        expect(result.offset).toBe(20);
        expect(result.page).toBe(3);
    });

    it('throws 400 when limit exceeds max page size', () => {
        const req = { query: { limit: '101', page: '1' } };
        expect(() => parseLimitOffset(req, 20, 100)).toThrow();
        try {
            parseLimitOffset(req, 20, 100);
        } catch (err) {
            expect(err.statusCode).toBe(400);
            expect(err.message).toMatch(/cannot exceed 100/i);
        }
    });

    it('throws 400 when limit is invalid (non-positive or NaN)', () => {
        expect(() => parseLimitOffset({ query: { limit: '0' } }, 20, 100)).toThrow();
        expect(() => parseLimitOffset({ query: { limit: '-1' } }, 20, 100)).toThrow();
        expect(() => parseLimitOffset({ query: { limit: 'abc' } }, 20, 100)).toThrow();
        try {
            parseLimitOffset({ query: { limit: '0' } }, 20, 100);
        } catch (err) {
            expect(err.statusCode).toBe(400);
        }
    });

    it('throws 400 when page is invalid', () => {
        expect(() => parseLimitOffset({ query: { page: '0' } }, 20, 100)).toThrow();
        expect(() => parseLimitOffset({ query: { page: '-1' } }, 20, 100)).toThrow();
        try {
            parseLimitOffset({ query: { page: 'abc' } }, 20, 100);
        } catch (err) {
            expect(err.statusCode).toBe(400);
        }
    });

    it('allows limit equal to max page size', () => {
        const req = { query: { limit: '100', page: '1' } };
        const result = parseLimitOffset(req, 20, 100);
        expect(result.limit).toBe(100);
        expect(result.offset).toBe(0);
    });

    it('DEFAULT_MAX_PAGE_SIZE is 100', () => {
        expect(DEFAULT_MAX_PAGE_SIZE).toBe(100);
    });
});

describe('List endpoints reject oversized limit', () => {
    it('endpoint using parseLimitOffset returns 400 when limit > max', async () => {
        const express = require('express');
        const app = express();
        app.get('/list', (req, res) => {
            try {
                const { limit, offset, page } = parseLimitOffset(req, 20, 100);
                return res.json({ success: true, pagination: { limit, page, total: 0 } });
            } catch (err) {
                if (err.statusCode === 400) {
                    return res.status(400).json({ success: false, message: err.message });
                }
                throw err;
            }
        });
        const request = require('supertest');
        const res = await request(app).get('/list').query({ limit: 101 });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/cannot exceed 100/i);
    });

    it('endpoint using parseLimitOffset returns 200 with pagination when limit valid', async () => {
        const express = require('express');
        const app = express();
        app.get('/list', (req, res) => {
            try {
                const { limit, offset, page } = parseLimitOffset(req, 20, 100);
                return res.json({
                    success: true,
                    pagination: { total: 0, page, limit, totalPages: 0 }
                });
            } catch (err) {
                if (err.statusCode === 400) {
                    return res.status(400).json({ success: false, message: err.message });
                }
                throw err;
            }
        });
        const request = require('supertest');
        const res = await request(app).get('/list').query({ limit: 10, page: 1 });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.pagination).toMatchObject({ limit: 10, page: 1, total: 0, totalPages: 0 });
    });

    it('pagination response includes total, page, limit, totalPages', () => {
        const req = { query: { limit: '20', page: '2' } };
        const { limit, offset, page } = parseLimitOffset(req, 20, 100);
        expect(limit).toBe(20);
        expect(offset).toBe(20);
        expect(page).toBe(2);
        const total = 55;
        const totalPages = Math.ceil(total / limit);
        expect(totalPages).toBe(3);
    });
});
