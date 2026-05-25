import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

try {
  console.log('Checking if login_method column exists...');
  const [rows] = await connection.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'login_method'"
  );
  
  if (rows.length > 0) {
    console.log('login_method column already exists, skipping.');
  } else {
    console.log('Adding login_method column...');
    await connection.execute("ALTER TABLE `users` ADD `login_method` varchar(64)");
    console.log('login_method column added.');
  }

  console.log('Checking if last_signed_in column exists...');
  const [rows2] = await connection.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_signed_in'"
  );
  
  if (rows2.length > 0) {
    console.log('last_signed_in column already exists, skipping.');
  } else {
    console.log('Adding last_signed_in column...');
    await connection.execute("ALTER TABLE `users` ADD `last_signed_in` timestamp DEFAULT (now())");
    console.log('last_signed_in column added.');
  }

  // Verify final state
  const [cols] = await connection.execute(
    "SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' ORDER BY ORDINAL_POSITION"
  );
  console.log('\nFinal users table columns:');
  for (const col of cols) {
    console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
  }

  console.log('\nMigration 0003 applied successfully.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await connection.end();
}
