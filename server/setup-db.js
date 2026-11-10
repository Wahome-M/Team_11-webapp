// Creates the FundiLink tables and sample data (schema.sql) on the database in your settings.
// Use it for a cloud database such as TiDB, where there's no XAMPP mysql.exe to run schema.sql with.
//
//   node setup-db.js          shows which database it would reset, and stops
//   node setup-db.js --yes    really does it (DELETES all existing users, jobs and bookings there)
//
// Settings come from environment variables first, then server/.env.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const mysql = require('mysql2/promise');

async function main() {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT) || 3306;
  const useSsl = process.env.DB_SSL === 'true';
  console.log(`Database: ${process.env.DB_USER}@${host}:${port} (TLS ${useSsl ? 'on' : 'off'})`);

  if (!process.argv.includes('--yes')) {
    console.log('This would DELETE all users, jobs and bookings there and load the sample data.');
    console.log('If that is the right database, run again with:  node setup-db.js --yes');
    return;
  }

  const conn = await mysql.createConnection({
    host,
    port,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: useSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    multipleStatements: true, // schema.sql is many statements in one file
  });
  try {
    await conn.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    const [[{ users }]] = await conn.query('SELECT COUNT(*) AS users FROM fundilink.users');
    console.log(`Done: tables created, ${users} sample users loaded.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(`Failed: ${err.code || ''} ${err.message}`);
  process.exit(1);
});
