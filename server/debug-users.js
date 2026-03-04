require('dotenv').config({ path: './.env' });
const db = require('./src/models');

async function listUsers() {
    try {
        // Wait for connection
        await db.sequelize.authenticate();
        console.log('Connected to DB. Querying users...');

        const users = await db.PlatformUser.findAll({
            attributes: ['id', 'email', 'firstName', 'lastName']
        });

        if (users.length === 0) {
            console.log('No users found in PlatformUser table.');
        } else {
            console.log(`Found ${users.length} users:`);
            users.forEach(u => {
                console.log(`- ${u.email} (${u.firstName} ${u.lastName})`);
            });
        }

    } catch (error) {
        console.error('Error listing users:', error.message);
    } finally {
        await db.sequelize.close();
    }
}

listUsers();
