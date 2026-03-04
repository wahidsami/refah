const db = require('./src/models');
(async () => {
    try {
        await db.sequelize.authenticate();
        await db.sequelize.query(`ALTER TYPE "enum_appointments_status" ADD VALUE IF NOT EXISTS 'started'`);
        console.log('Enum updated successfully');
    } catch (e) {
        console.error('Crash:', e.message);
    } finally {
        await db.sequelize.close();
    }
})();
