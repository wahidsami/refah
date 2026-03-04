const db = require('./src/models');

async function check() {
    try {
        const users = await db.PlatformUser.findAll();
        console.log(`Checking ${users.length} customer records:`);
        users.forEach(u => {
            console.log(`- Name: ${u.firstName} ${u.lastName}, Photo: ${JSON.stringify(u.profileImage)}`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
