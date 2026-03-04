#!/usr/bin/env node
/**
 * Inspect production DB: list tables and columns (and optional row counts).
 * Run from server dir with DATABASE_URL set (e.g. in Coolify container):
 *   node scripts/db-inspect.js
 *   node scripts/db-inspect.js --counts   # include row count per table
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const dialect = 'postgres';
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL (e.g. in Coolify env)');
  process.exit(1);
}

const sequelize = new Sequelize(url, { dialect, logging: false });
const includeCounts = process.argv.includes('--counts');

async function main() {
  const [tables] = await sequelize.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  console.log('=== Public tables and columns ===\n');

  for (const { table_name } of tables) {
    const [cols] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ?
      ORDER BY ordinal_position
    `, { replacements: [table_name] });

    let line = table_name;
    if (includeCounts) {
      try {
        const [r] = await sequelize.query(`SELECT count(*) AS n FROM "${table_name}"`);
        line += ` (rows: ${r[0].n})`;
      } catch (_) {
        line += ' (count failed)';
      }
    }
    console.log(line);

    for (const c of cols) {
      console.log(`  - ${c.column_name} (${c.data_type}) ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    }
    console.log('');
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
