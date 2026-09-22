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

// Validation Helper Function for creating or updating a user
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
  if (!body.role || typeof body.role !== 'string') {
    errors.push('role is required and must be a string');
  }
  if (!isUpdate && (!body.password || typeof body.password !== 'string')) {
    errors.push('password is required and must be a string');
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
    const formattedUsers = rows.map(mapUserToContract);

    // FIX #1: Send formattedUsers instead of raw rows
    return res.json(formattedUsers);
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

    // FIX #2: Removed duplicated res.json call
    const formattedUser = mapUserToContract(rows[0]);
    return res.status(200).json(formattedUser);

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

    const { firstName, lastName, email, password, role, trade, location, verified } = req.body;

    const [result] = await db.query(
      'INSERT INTO users (firstName, lastName, email, password, role, trade, location, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email, password, role, trade || null, location || null, verified ? 1 : 0]
    );

    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const createdUser = mapUserToContract(rows[0]);

    return res.status(201).json(createdUser);
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

    const [existing] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { firstName, lastName, email, password, role, trade, location, verified } = req.body;

    await db.query(
      `UPDATE users 
       SET firstName = ?, lastName = ?, email = ?, password = COALESCE(?, password), role = ?, trade = ?, location = ?, verified = ? 
       WHERE id = ?`,
      [firstName, lastName, email, password || null, role, trade || null, location || null, verified ? 1 : 0, userId]
    );

    const [updatedRows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    const updatedUser = mapUserToContract(updatedRows[0]);

    return res.status(200).json(updatedUser);
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

    const [existing] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
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

// POST /users/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
    
    // FIX #3: Map user payload to omit sensitive internal details like password
    const userPayload = mapUserToContract(rows[0]);
    return res.json(userPayload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;