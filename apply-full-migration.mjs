import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
config();

const conn = await createConnection(process.env.DATABASE_URL);

console.log('Dropping old-structure tables...');
await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
for (const t of ['businesses','briefings','fixes','fixHistory','scans','scores']) {
  await conn.execute(`DROP TABLE IF EXISTS \`${t}\``);
  console.log(`  Dropped ${t}`);
}
await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

console.log('Applying migration 0002...');
const sql0002 = readFileSync('./drizzle/0002_marvelous_blob.sql', 'utf8');
// Split on --> statement-breakpoint, skip CREATE TABLE users (already exists)
const statements = sql0002.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
for (const stmt of statements) {
  if (stmt.includes('CREATE TABLE `users`')) {
    console.log('  Skipping CREATE TABLE users (already exists)');
    continue;
  }
  if (stmt.includes('ALTER TABLE `users` ADD `subscriptionTier`') ||
      stmt.includes('ALTER TABLE `users` ADD `stripeCustomerId`') ||
      stmt.includes('ALTER TABLE `users` ADD `stripeSubscriptionId`')) {
    // Check if column already exists
    const colName = stmt.match(/ADD `(\w+)`/)?.[1];
    const [cols] = await conn.execute(`SHOW COLUMNS FROM users LIKE '${colName}'`);
    if (cols.length > 0) {
      console.log(`  Skipping ALTER TABLE users ADD ${colName} (already exists)`);
      continue;
    }
  }
  try {
    await conn.execute(stmt);
    const tableName = stmt.match(/CREATE TABLE `(\w+)`/)?.[1] || stmt.match(/ALTER TABLE `(\w+)`/)?.[1] || 'unknown';
    console.log(`  Applied: ${tableName}`);
  } catch (e) {
    console.error(`  ERROR on: ${stmt.substring(0, 80)}...`);
    console.error(`  ${e.message}`);
  }
}

console.log('Applying migration 0003 (loginMethod/lastSignedIn)...');
const sql0003 = readFileSync('./drizzle/0003_late_prima.sql', 'utf8');
const stmts0003 = sql0003.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
for (const stmt of stmts0003) {
  const colName = stmt.match(/ADD `(\w+)`/)?.[1] || stmt.match(/ADD COLUMN `(\w+)`/)?.[1];
  if (colName) {
    const [cols] = await conn.execute(`SHOW COLUMNS FROM users LIKE '${colName}'`);
    if (cols.length > 0) {
      console.log(`  Skipping ALTER TABLE users ADD ${colName} (already exists)`);
      continue;
    }
  }
  try {
    await conn.execute(stmt);
    console.log(`  Applied: ${stmt.substring(0, 60)}`);
  } catch (e) {
    console.error(`  ERROR: ${e.message}`);
  }
}

console.log('Marking migrations 0001, 0002, 0003 as applied...');
const hashes = {
  '0001': 'dcf8c335ddb59c7ce9b8bd794d8b90a2bd4a7fc0a2d212b7f51f3266a3379407',
  '0002': '3fa122f0b0a3f12a46983962d97ce3688bcc4217691fcfa986c6b145c627b034',
  '0003': '9b271798f2d08cfea1efc4b86f608e55637bc60e5960f4070d235402e13e6a63',
};
for (const [tag, hash] of Object.entries(hashes)) {
  const [existing] = await conn.execute('SELECT hash FROM __drizzle_migrations WHERE hash = ?', [hash]);
  if (existing.length > 0) {
    console.log(`  Migration ${tag} already recorded`);
  } else {
    await conn.execute('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [hash, Date.now()]);
    console.log(`  Recorded migration ${tag}`);
  }
}

await conn.end();
console.log('Done!');
