const mysql = require('mysql2');
// Settings live in server/.env (one folder up). On Render they come from its Environment page instead.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  // Cloud databases (e.g. TiDB Cloud) only accept encrypted connections: set DB_SSL=true for them.
  // XAMPP on a laptop doesn't use TLS, so leave DB_SSL unset there.
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool.promise();