#!/usr/bin/env node
/**
 * Validate migration files: ensure each has up/down and loads without error.
 * Use as a dry-run in CI when no DB is available.
 * Run: node scripts/validate-migrations.js
 */
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js')).sort();

let failed = 0;
for (const file of files) {
    const filepath = path.join(migrationsDir, file);
    try {
        const mod = require(filepath);
        if (typeof mod.up !== 'function' || typeof mod.down !== 'function') {
            console.error(`${file}: missing up() or down()`);
            failed++;
        } else {
            console.log(`OK ${file}`);
        }
    } catch (err) {
        console.error(`${file}: ${err.message}`);
        failed++;
    }
}
process.exit(failed > 0 ? 1 : 0);
