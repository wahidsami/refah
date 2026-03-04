/**
 * Quick diagnostic script: test the staff login directly
 * Run: node test_staff_login.js
 */
const db = require('./src/models');

async function diagnose() {
    try {
        console.log('1. Connecting to database...');
        await db.sequelize.authenticate();
        console.log('   ✅ DB connected');

        console.log('\n2. Checking if staff_permissions table exists...');
        const [results] = await db.sequelize.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='staff_permissions'"
        );
        if (results.length > 0) {
            console.log('   ✅ staff_permissions table exists');
        } else {
            console.log('   ❌ staff_permissions table DOES NOT EXIST');
            console.log('   → Creating it now via sync...');
            await db.StaffPermission.sync({ force: false });
            console.log('   ✅ Created staff_permissions table');
        }

        console.log('\n3. Checking other new tables...');
        for (const tbl of ['staff_payrolls', 'staff_messages', 'reviews']) {
            const [r] = await db.sequelize.query(
                `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='${tbl}'`
            );
            console.log(`   ${tbl}: ${r.length > 0 ? '✅ exists' : '❌ MISSING'}`);
        }

        console.log('\n4. Testing Staff model with StaffPermission include...');
        const staff = await db.Staff.findOne({
            include: [
                { model: db.StaffPermission, as: 'permissions' }
            ]
        });
        console.log(`   ✅ Query succeeded. Staff found: ${staff ? staff.email : 'none'}`);
        if (staff && staff.permissions) {
            console.log('   Permissions:', JSON.stringify(staff.permissions.toJSON(), null, 2));
        } else if (staff) {
            console.log('   No permissions row yet (will be auto-created on first access)');
        }

        console.log('\n✅ All checks passed!');
    } catch (error) {
        console.error('\n❌ FAILED:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await db.sequelize.close();
        process.exit(0);
    }
}

diagnose();
