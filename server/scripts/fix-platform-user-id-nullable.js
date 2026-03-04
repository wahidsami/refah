require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/models');

async function fix() {
  await db.sequelize.query(`
    ALTER TABLE transactions
    ALTER COLUMN "platformUserId" DROP NOT NULL;
  `);
  console.log('Done: platformUserId is now nullable');
  process.exit(0);
}
fix().catch(e => { console.error(e); process.exit(1); }).finally(() => db.sequelize.close());
