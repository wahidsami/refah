/**
 * Step-by-step login simulation — will show EXACTLY which line crashes
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./src/models');

async function simulate() {
    try {
        await db.sequelize.authenticate();
        console.log('✅ Step 1: DB connected');

        // Step 2: Check env vars
        console.log(`\n✅ Step 2: ENV check`);
        console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ set (' + process.env.JWT_SECRET.length + ' chars)' : '❌ MISSING'}`);
        console.log(`   JWT_REFRESH_SECRET: ${process.env.JWT_REFRESH_SECRET ? '✅ set (' + process.env.JWT_REFRESH_SECRET.length + ' chars)' : '❌ MISSING'}`);

        // Step 3: Find staff
        console.log('\n✅ Step 3: Finding staff...');
        const staff = await db.Staff.findOne({
            where: { email: 'sarah@rifah.sa' },
            include: [
                { model: db.Tenant, as: 'tenant', attributes: ['id', 'name_en', 'name_ar', 'logo', 'isActive'] },
                { model: db.StaffPermission, as: 'permissions' }
            ]
        });
        if (!staff) { console.log('   ❌ Staff not found'); return; }
        console.log(`   Found: ${staff.email}, app_enabled: ${staff.app_enabled}, isActive: ${staff.isActive}`);
        console.log(`   password_hash exists: ${!!staff.password_hash}`);
        console.log(`   tenant: ${staff.tenant ? staff.tenant.name_en : 'NONE'}`);
        console.log(`   permissions: ${staff.permissions ? JSON.stringify(staff.permissions.toJSON()) : 'null (no row yet)'}`);

        // Step 4: Token generation
        console.log('\n✅ Step 4: Generating tokens...');
        const accessToken = jwt.sign(
            { sub: staff.id, tenantId: staff.tenantId, role: 'staff' },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        const refreshToken = jwt.sign(
            { sub: staff.id, tenantId: staff.tenantId, role: 'staff', purpose: 'refresh' },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '30d' }
        );
        console.log(`   accessToken: ${accessToken.substring(0, 30)}...`);
        console.log(`   refreshToken: ${refreshToken.substring(0, 30)}...`);

        // Step 5: Build response
        console.log('\n✅ Step 5: Building response payload...');
        const payload = {
            success: true,
            message: 'Login successful',
            tokens: { accessToken, refreshToken },
            user: {
                id: staff.id,
                name: staff.name,
                email: staff.email,
                photo: staff.photo,
                must_change_password: staff.must_change_password,
                tenant: staff.tenant,
                permissions: staff.permissions
            }
        };
        console.log(`   Payload keys: ${Object.keys(payload)}`);
        console.log(`   User keys: ${Object.keys(payload.user)}`);

        console.log('\n🎉 Login simulation PASSED — everything works!');
        console.log('\nFull response would be:');
        console.log(JSON.stringify(payload, null, 2).substring(0, 500) + '...');

    } catch (error) {
        console.error('\n❌ CRASHED at:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await db.sequelize.close();
    }
}

simulate();
