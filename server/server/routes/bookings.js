const express = require('express');
const router = express.Router();
const db = require('../db');

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
    const [result] = await db.query(
      'INSERT INTO bookings (jobId, workerId, workerName, status) VALUES (?, ?, ?, ?)',
      [jobId, workerId, workerName, 'pending']
    );
    res.status(201).json({ id: result.insertId, jobId, workerId, workerName, status: 'pending' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// PUT /bookings/:id (update booking status)
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const [result] = await db.query(
      'UPDATE bookings SET status = ? WHERE id = ?',
      [status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json({ id: req.params.id, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

module.exports = router;