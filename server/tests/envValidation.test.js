/**
 * Tests for Phase 0 hardening: env validation in production vs development.
 * - Production: server must fail to start when SUPERADMIN_PASSWORD missing or weak, or JWT secrets are defaults.
 * - Development: validation passes when required vars are set.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const serverDir = path.join(__dirname, '..');
const node = process.execPath;

const requiredEnv = {
    POSTGRES_USER: 'postgres',
    POSTGRES_PASSWORD: 'test_password',
    POSTGRES_DB: 'rifah_test',
    DB_HOST: 'localhost',
    DB_PORT: '5434',
    PORT: '5000',
    JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long-here',
    JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-characters-long'
};

function runValidation(envOverrides = {}) {
    const env = { ...process.env, ...requiredEnv, ...envOverrides };
    const result = spawnSync(node, ['-e', "require('./src/middleware/validateEnvironment')();"], {
        cwd: serverDir,
        env,
        encoding: 'utf8',
        timeout: 3000
    });
    return { status: result.status, signal: result.signal, stderr: result.stderr, stdout: result.stdout };
}

describe('Environment validation (Phase 0 hardening)', () => {
    test('production: exits with code 1 when SUPERADMIN_PASSWORD is missing', () => {
        const { status, stderr } = runValidation({
            NODE_ENV: 'production',
            SUPERADMIN_PASSWORD: ''
        });
        expect(status).toBe(1);
        expect(stderr).toMatch(/SUPERADMIN_PASSWORD/);
    });

    test('production: exits with code 1 when SUPERADMIN_PASSWORD is too short', () => {
        const { status, stderr } = runValidation({
            NODE_ENV: 'production',
            SUPERADMIN_PASSWORD: 'short'
        });
        expect(status).toBe(1);
        expect(stderr).toMatch(/12 characters/);
    });

    test('production: exits with code 1 when SUPERADMIN_PASSWORD is weak (RifahAdmin@2024)', () => {
        const { status, stderr } = runValidation({
            NODE_ENV: 'production',
            SUPERADMIN_PASSWORD: 'RifahAdmin@2024'
        });
        expect(status).toBe(1);
        expect(stderr).toMatch(/weak password/);
    });

    test('production: exits with code 1 when JWT_SECRET is default value', () => {
        const { status, stderr } = runValidation({
            NODE_ENV: 'production',
            JWT_SECRET: 'rifah-super-admin-secret-key-2024',
            SUPERADMIN_PASSWORD: 'a-strong-password-with-12-chars'
        });
        expect(status).toBe(1);
        expect(stderr).toMatch(/JWT_SECRET/);
    });

    test('production: validation passes when all required and strong values are set', () => {
        const { status } = runValidation({
            NODE_ENV: 'production',
            SUPERADMIN_PASSWORD: 'a-strong-password-with-12-chars'
        });
        expect(status).toBe(0);
    });

    test('development: validation passes with required vars set (SUPERADMIN_PASSWORD optional)', () => {
        const { status } = runValidation({
            NODE_ENV: 'development'
        });
        expect(status).toBe(0);
    });

    test('development: validation passes with explicit SUPERADMIN_PASSWORD set', () => {
        const { status } = runValidation({
            NODE_ENV: 'development',
            SUPERADMIN_PASSWORD: 'dev-admin-password-12'
        });
        expect(status).toBe(0);
    });
});
