const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword, verifyPassword } = require('../passwords');

const ROLES = ['worker', 'employer'];

// Full profile: only for a single user (GET /users/:id, create, update, login).
// Built from an explicit field list, so the password hash can never leak.
function mapUserToContract(dbUser) {
  return {
    id: Number(dbUser.id),
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    email: dbUser.email,
    role: dbUser.role,
    trade: dbUser.trade || null,
    location: dbUser.location,
    verified: Boolean(dbUser.verified), // true boolean instead of 1/0
  };
}

// Search results: same as above but WITHOUT email, so nobody can download every user's email in one call.
function mapUserSummary(dbUser) {
  const { email, ...summary } = mapUserToContract(dbUser);
  return summary;
}

// Validation for creating or updating a user
function validateUserData(body, isUpdate = false) {
  const errors = [];

  if (!body.firstName || typeof body.firstName !== 'string') {
    errors.push('firstName is required and must be a string');
  }
  if (!body.lastName || typeof body.lastName !== 'string') {
    errors.push('lastName is required and must be a string');
  }
  if (!body.email || typeof body.email !== 'string') {
    errors.push('email is required and must be a string');
  }
  if (!ROLES.includes(body.role)) {
    errors.push('role is required and must be worker or employer');
  }
  if (!isUpdate && (!body.password || typeof body.password !== 'string')) {
    errors.push('password is required and must be a string');
  }
  if (isUpdate && body.password !== undefined && (typeof body.password !== 'string' || !body.password)) {
    errors.push('password must be a non-empty string if provided');
  }

  return errors;
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
    return res.json(rows.map(mapUserSummary));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch users' });
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
    return res.status(200).json(mapUserToContract(rows[0]));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /users (registration)
router.post('/', async (req, res) => {
  try {
    const errors = validateUserData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Only these fields are read from the body. Anything else (id, verified, isAdmin...) is ignored.
    // New accounts always start unverified.
    const { firstName, lastName, email, password, role, trade, location } = req.body;

    const [result] = await db.query(
      'INSERT INTO users (firstName, lastName, email, password, role, trade, location, verified) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
      [firstName, lastName, email, hashPassword(password), role, trade || null, location || null]
    );

    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    return res.status(201).json(mapUserToContract(rows[0]));
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /users/:id (update existing user)
router.put('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const errors = validateUserData(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // `verified` is not accepted from callers: a user can't mark themselves as verified.
    const { firstName, lastName, email, password, role, trade, location } = req.body;

    await db.query(
      `UPDATE users
       SET firstName = ?, lastName = ?, email = ?, password = COALESCE(?, password), role = ?, trade = ?, location = ?
       WHERE id = ?`,
      [firstName, lastName, email, password ? hashPassword(password) : null, role, trade || null, location || null, userId]
    );

    const [updatedRows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    return res.status(200).json(mapUserToContract(updatedRows[0]));
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /users/:id (delete user)
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST /users/login (checks credentials; no token yet)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    // Same message whether the email or the password is wrong, so callers can't probe which emails exist
    if (rows.length === 0 || !verifyPassword(password, rows[0].password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    return res.json(mapUserToContract(rows[0]));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
