import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

try {
  // Drop the snake_case duplicates that were added by mistake
  console.log('Dropping duplicate login_method column...');
  await connection.execute("ALTER TABLE `users` DROP COLUMN `login_method`");
  console.log('login_method dropped.');

  console.log('Dropping duplicate last_signed_in column...');
  await connection.execute("ALTER TABLE `users` DROP COLUMN `last_signed_in`");
  console.log('last_signed_in dropped.');

  // Verify final state
  const [cols] = await connection.execute(
    "SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' ORDER BY ORDINAL_POSITION"
  );
  console.log('\nFinal users table columns:');
  for (const col of cols) {
    console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
  }
  console.log('\nCleanup complete.');
} catch (err) {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
} finally {
  await connection.end();
}
