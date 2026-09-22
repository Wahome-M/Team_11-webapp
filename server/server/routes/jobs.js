const express = require('express');
const router = express.Router();
const db = require('../db');

// Shape a DB row to match the Job schema in openapi.yaml
// (MySQL returns DECIMAL as a string and BOOLEAN as 0/1)
function toJob(row) {
  return {
    ...row,
    pay: Number(row.pay),
    urgent: Boolean(row.urgent),
    isActive: Boolean(row.isActive)
  };
}

const isNonEmptyString = v => typeof v === 'string' && v.trim() !== '';

// Validation for POST /jobs, built from the contract's requestBody schema.
// Checks: 1) required fields present, 2) correct types, 3) values usable.
function validateJob(body) {
  const errors = [];

  // Required string fields
  for (const field of ['title', 'category', 'location']) {
    if (body[field] === undefined || body[field] === null) {
      errors.push(`${field} is required`);
    } else if (!isNonEmptyString(body[field])) {
      errors.push(`${field} must be a non-empty string`);
    }
  }

  // pay: required number, must be positive
  if (body.pay === undefined || body.pay === null) {
    errors.push('pay is required');
  } else if (typeof body.pay !== 'number' || !Number.isFinite(body.pay) || body.pay <= 0) {
    errors.push('pay must be a positive number');
  }

  // employerId: required integer
  if (body.employerId === undefined || body.employerId === null) {
    errors.push('employerId is required');
  } else if (!Number.isInteger(body.employerId) || body.employerId <= 0) {
    errors.push('employerId must be a positive integer');
  }

  // Optional fields: only checked if they were sent
  for (const field of ['payType', 'duration', 'employer', 'description']) {
    if (body[field] !== undefined && body[field] !== null && typeof body[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
  }
  if (body.urgent !== undefined && body.urgent !== null && typeof body.urgent !== 'boolean') {
    errors.push('urgent must be true or false');
  }

  return errors;
}

// GET /jobs (browse all, with optional category filter)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM jobs WHERE isActive = TRUE';
    const params = [];
    if (category) { query += ' AND category = ?'; params.push(category); }

    const [rows] = await db.query(query, params);
    res.json(rows.map(toJob));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// POST /jobs (create a job posting)
// Validate first, write second: nothing touches the database until every check passes.
router.post('/', async (req, res) => {
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  const errors = validateJob(body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; ') });
  }

  try {
    // Value check: employerId must point to a real employer account
    const [employers] = await db.query(
      "SELECT id FROM users WHERE id = ? AND role = 'employer'",
      [body.employerId]
    );
    if (employers.length === 0) {
      return res.status(400).json({ error: 'employerId does not match an existing employer' });
    }

    const [result] = await db.query(
      `INSERT INTO jobs (title, category, location, pay, payType, urgent, duration, employerId, employer, description, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        body.title.trim(),
        body.category.trim(),
        body.location.trim(),
        body.pay,
        body.payType || 'fixed',
        body.urgent ?? false,
        body.duration ?? null,
        body.employerId,
        body.employer ?? null,
        body.description ?? null
      ]
    );

    // Return the row as actually stored, mapped to the contract's Job shape
    const [rows] = await db.query('SELECT * FROM jobs WHERE id = ?', [result.insertId]);
    res.status(201).json(toJob(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// GET /jobs/:id/bookings (all applications for one job)
router.get('/:id/bookings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bookings WHERE jobId = ?', [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings for job' });
  }
});

module.exports = router;