require('dotenv').config({ path: './.env' });
const db = require('./src/models');
const bcrypt = require('bcryptjs'); // or bcrypt

async function resetPassword() {
    try {
        await db.sequelize.authenticate();

        const email = 'wahidsami@gmail.com';
        const newPassword = '123456';

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash(newPassword, salt);

        const [updatedRows] = await db.PlatformUser.update(
            { password: password },
            { where: { email: email } }
        );

        if (updatedRows > 0) {
            console.log(`Successfully reset password for ${email} to '${newPassword}'`);
        } else {
            console.log(`User ${email} not found.`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.sequelize.close();
    }
}

resetPassword();
