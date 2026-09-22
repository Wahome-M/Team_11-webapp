const express = require('express');
const router = express.Router();
const db = require('../db');

// Explicit mapping step to guarantee contract adherence
function mapUserToContract(dbUser) {
  return {
    id: Number(dbUser.id),
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    email: dbUser.email,
    role: dbUser.role,
    trade: dbUser.trade || null,
    location: dbUser.location,
    verified: Boolean(dbUser.verified) // Guarantees true boolean instead of 1/0
  };
}

// GET /users?role=worker&trade=plumbing&location=Westlands&verified=true
router.get('/', async (req, res) => {
  try {
    const { role, trade, location, verified } = req.query;
    let query = 'SELECT id, firstName, lastName, email, role, trade, location, verified FROM users WHERE 1=1';
    const params = [];

    if (role) { query += ' AND role = ?'; params.push(role); }
    if (trade) { query += ' AND trade = ?'; params.push(trade); }
    if (location) { query += ' AND location LIKE ?'; params.push(`%${location}%`); }
    if (verified) { query += ' AND verified = ?'; params.push(verified === 'true' ? 1 : 0); }

    const [rows] = await db.query(query, params);

    const formattedUsers = rows.map(mapUserToContract);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /users/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, firstName, lastName, email, role, trade, location, verified FROM users WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);

    const formattedUser = mapUserToContract(rows[0]);
    
    res.status(200).json(formattedUser);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /users (registration)
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const [result] = await db.query(
      'INSERT INTO users (firstName, lastName, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [firstName, lastName, email, password, role]
    );
    res.status(201).json({ id: result.insertId, firstName, lastName, email, role });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// POST /users/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;