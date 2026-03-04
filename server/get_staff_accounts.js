const db = require('./src/models');
const bcrypt = require('bcryptjs');

async function getOrSetStaff() {
    try {
        console.log('Connecting to db...');
        await db.sequelize.authenticate();

        // Find staff with passwords
        const staffWithAccess = await db.Staff.findAll({
            where: { app_enabled: true }
        });

        let found = false;
        console.log('--- Active Staff with App Access ---');
        for (const s of staffWithAccess) {
            if (s.password_hash) {
                console.log(`Email: ${s.email} | Name: ${s.name}`);
                found = true;
            }
        }

        if (!found) {
            console.log('No staff members have app access with a password set.');

            // Find any staff to set up
            const anyStaff = await db.Staff.findOne();
            if (anyStaff) {
                console.log(`\nSetting up ${anyStaff.email} with password 'password123'`);
                const salt = await bcrypt.genSalt(10);
                anyStaff.password_hash = await bcrypt.hash('password123', salt);
                anyStaff.app_enabled = true;
                anyStaff.isActive = true;
                await anyStaff.save();
                console.log(`✅ Success! You can login with:\nEmail: ${anyStaff.email}\nPassword: password123`);
            } else {
                console.log('No staff members found in the database at all.');
            }
        } else {
            console.log('\nIf you don\'t know the password, you can run a script to reset it.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await db.sequelize.close();
    }
}

getOrSetStaff();
