#!/usr/bin/env node
/**
 * Print tenant, service, and staff IDs from the DB for load-test env vars.
 * Run from server/: node scripts/get-load-test-ids.js
 * Requires DB connection (same .env as the API).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');

const modelsPath = path.join(__dirname, '../src/models');
const db = require(modelsPath);

async function main() {
    try {
        await db.sequelize.authenticate();
    } catch (err) {
        console.error('Cannot connect to DB. Check .env (POSTGRES_* or DATABASE_URL) and that the DB is running.');
        console.error(err.message);
        process.exit(1);
    }

    const { Op } = require('sequelize');

    let tenant = await db.Tenant.findOne({
        where: { status: 'approved' },
        order: [['createdAt', 'ASC']],
        attributes: ['id', 'name', 'slug', 'status']
    });
    if (!tenant) {
        tenant = await db.Tenant.findOne({
            order: [['createdAt', 'ASC']],
            attributes: ['id', 'name', 'slug', 'status']
        });
    }
    if (!tenant) {
        console.log('No tenant found. Create a tenant first.');
        process.exit(1);
    }

    const service = await db.Service.findOne({
        where: { tenantId: tenant.id, isActive: true },
        order: [['createdAt', 'ASC']],
        attributes: ['id', 'name_en', 'tenantId']
    });
    if (!service) {
        console.log('No service found for tenant', tenant.id, '(' + (tenant.name || tenant.slug) + '). Create a service first.');
        process.exit(1);
    }

    const staff = await db.Staff.findOne({
        where: { tenantId: tenant.id, isActive: true },
        order: [['createdAt', 'ASC']],
        attributes: ['id', 'name', 'tenantId']
    });

    console.log('');
    console.log('Load test IDs from DB');
    console.log('----------------------');
    console.log('Tenant:', tenant.id, '|', tenant.name || tenant.slug);
    console.log('Service:', service.id, '|', service.name_en || service.id);
    console.log('Staff:', staff ? staff.id + ' | ' + staff.name : '(none – add staff for collision phase)');
    console.log('');
    console.log('Copy and run in PowerShell (replace <JWT> with a real user token for create/collision):');
    console.log('');
    console.log('  $env:BASE_URL = "http://localhost:5000"');
    console.log('  $env:TENANT_ID = "' + tenant.id + '"');
    console.log('  $env:SERVICE_ID = "' + service.id + '"');
    if (staff) {
        console.log('  $env:STAFF_ID = "' + staff.id + '"');
    }
    console.log('  $env:AUTH_TOKEN = "<JWT>"');
    console.log('  npm run load-test');
    console.log('');
    console.log('Or for k6 (from project root):');
    console.log('');
    console.log('  $env:BASE_URL = "http://localhost:5000"');
    console.log('  $env:TENANT_ID = "' + tenant.id + '"');
    console.log('  $env:SERVICE_ID = "' + service.id + '"');
    if (staff) {
        console.log('  $env:STAFF_ID = "' + staff.id + '"');
    }
    console.log('  $env:AUTH_TOKEN = "<JWT>"');
    console.log('  k6 run server/load-test/booking-load.js');
    console.log('');

    await db.sequelize.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
