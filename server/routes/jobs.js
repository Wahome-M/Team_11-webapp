const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /jobs (browse all, with optional category filter)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM jobs WHERE isActive = TRUE';
    const params = [];
    if (category) { query += ' AND category = ?'; params.push(category); }

    const [rows] = await db.query(query, params);
    const jobs = rows.map(job => ({
      ...job,
      pay: Number(job.pay),
      urgent: Boolean(job.urgent),
      isActive: Boolean(job.isActive)
    }));
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// POST /jobs (create a job posting)
router.post('/', async (req, res) => {
  try {
    const { title, category, location, pay, payType, urgent, duration, employerId, employer, description } = req.body;
    const [result] = await db.query(
      `INSERT INTO jobs (title, category, location, pay, payType, urgent, duration, employerId, employer, description, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [title, category, location, pay, payType || 'fixed', urgent || false, duration, employerId, employer, description]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
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