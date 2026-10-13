const express = require('express');
const router = express.Router();
const db = require('../db');

const STATUSES = ['pending', 'confirmed', 'rejected', 'completed'];

const isPositiveInt = (v) => Number.isInteger(v) && v > 0;

// GET /bookings/:id (single booking status)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// POST /bookings (apply to a job)
router.post('/', async (req, res) => {
  try {
    const { jobId, workerId, workerName } = req.body;
    const details = [];
    if (!isPositiveInt(jobId)) details.push('jobId is required and must be a positive integer');
    if (!isPositiveInt(workerId)) details.push('workerId is required and must be a positive integer');
    if (workerName !== undefined && typeof workerName !== 'string') details.push('workerName must be a string');
    if (details.length) return res.status(400).json({ error: 'Validation failed', details });

    const [jobs] = await db.query('SELECT id FROM jobs WHERE id = ?', [jobId]);
    if (jobs.length === 0) return res.status(404).json({ error: 'Job not found' });
    const [workers] = await db.query('SELECT id FROM users WHERE id = ?', [workerId]);
    if (workers.length === 0) return res.status(404).json({ error: 'Worker not found' });

    const [result] = await db.query(
      'INSERT INTO bookings (jobId, workerId, workerName, status) VALUES (?, ?, ?, ?)',
      [jobId, workerId, workerName || null, 'pending']
    );
    const [rows] = await db.query('SELECT * FROM bookings WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// PUT /bookings/:id (update booking status)
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [`status must be one of: ${STATUSES.join(', ')}`],
      });
    }
    const [result] = await db.query(
      'UPDATE bookings SET status = ? WHERE id = ?',
      [status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Booking not found' });
    const [rows] = await db.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

module.exports = router;
