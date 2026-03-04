const db = require('./src/models');
const bcrypt = require('bcryptjs');

async function setPassword() {
    try {
        await db.sequelize.authenticate();

        const email = 'wahidsami@gmail.com';
        const staff = await db.Staff.findOne({ where: { email } });

        if (staff) {
            const salt = await bcrypt.genSalt(10);
            staff.password_hash = await bcrypt.hash('password123', salt);
            staff.app_enabled = true;
            staff.must_change_password = false;
            await staff.save();
            console.log(`Password for ${email} has been set to: password123`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await db.sequelize.close();
    }
}

setPassword();
