// Routes for OUR OWN website (Casual-Worker-Sourcing-App). A browser page can't keep an API key
// secret, so the website doesn't use one. Instead:
//   - signup, login and the job list are public (they're public on any website), with a strict
//     per-IP limit (set in app.js) to slow password guessing and spam sign-ups
//   - everything a logged-in person does needs the session token they got at login, sent as
//     "Authorization: Bearer <token>". The token says who they are, so a page can't act for someone else.
// Partners and scripts still use the API-key routes (/users, /jobs, /bookings, /v2/...).
const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const db = require('../db');
const users = require('./users');
const jobs = require('./jobs');
const bookings = require('./bookings');

// Tokens are signed with this secret. Set WEB_SESSION_SECRET in .env (or on Render) so logins
// survive a restart; without it, a random one is made at startup and everyone logs in again after a restart.
const SECRET = process.env.WEB_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_HOURS = 8;

const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    role: user.role,
    exp: Date.now() + SESSION_HOURS * 3600 * 1000,
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function requireSession(role) {
  return (req, res, next) => {
    const session = readToken((req.get('Authorization') || '').replace(/^Bearer\s+/i, ''));
    if (!session) return res.status(401).json({ error: 'Please log in again' });
    if (role && session.role !== role) {
      return res.status(403).json({ error: `Only ${role}s can do this` });
    }
    req.session = session;
    next();
  };
}

// Signup and login reuse the API's own handlers; on success we add a session token to the user they return.
function withToken(handler) {
  return (req, res) => {
    const json = res.json.bind(res);
    res.json = (body) => json(res.statusCode < 300 && body && body.id ? { ...body, token: makeToken(body) } : body);
    return handler(req, res);
  };
}

router.post('/signup', withToken(users.registerUser));
router.post('/login', withToken(users.loginUser));
router.get('/jobs', jobs.listJobs);

// ---- Workers ----

// Apply to a job as the logged-in worker
router.post('/bookings', requireSession('worker'), async (req, res) => {
  try {
    const jobId = req.body && req.body.jobId;
    const [existing] = await db.query(
      'SELECT id FROM bookings WHERE jobId = ? AND workerId = ?', [jobId, req.session.id],
    );
    if (existing.length) return res.status(409).json({ error: 'You have already applied for this job' });
    const [me] = await db.query('SELECT firstName, lastName FROM users WHERE id = ?', [req.session.id]);
    req.body = { jobId, workerId: req.session.id, workerName: me[0] ? `${me[0].firstName} ${me[0].lastName}` : undefined };
    return bookings.createBooking(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to apply' });
  }
});

// My applications, newest first, with the job they're for
router.get('/my-bookings', requireSession('worker'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.id, b.jobId, b.status, b.appliedAt, j.title, j.category, j.location, j.pay, j.payType, j.employer
         FROM bookings b JOIN jobs j ON j.id = b.jobId
        WHERE b.workerId = ? ORDER BY b.appliedAt DESC, b.id DESC`,
      [req.session.id],
    );
    res.json(rows.map((r) => ({ ...r, pay: Number(r.pay) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load your applications' });
  }
});

// ---- Employers ----

// Post a job as the logged-in employer
router.post('/jobs', requireSession('employer'), async (req, res) => {
  try {
    const [me] = await db.query('SELECT firstName, lastName FROM users WHERE id = ?', [req.session.id]);
    req.body = {
      ...(req.body || {}),
      employerId: req.session.id,
      employer: me[0] ? `${me[0].firstName} ${me[0].lastName}` : null,
    };
    return jobs.createJob(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to post job' });
  }
});

// My jobs, each with the people who applied
router.get('/my-jobs', requireSession('employer'), async (req, res) => {
  try {
    const [jobRows] = await db.query(
      'SELECT * FROM jobs WHERE employerId = ? ORDER BY id DESC', [req.session.id],
    );
    const ids = jobRows.map((j) => j.id);
    const [bookingRows] = ids.length
      ? await db.query(
        `SELECT b.id, b.jobId, b.workerId, b.workerName, b.status, b.appliedAt, u.trade, u.location, u.verified
           FROM bookings b JOIN users u ON u.id = b.workerId
          WHERE b.jobId IN (?) ORDER BY b.id`,
        [ids],
      )
      : [[]];
    res.json(jobRows.map((j) => ({
      ...j,
      pay: Number(j.pay),
      urgent: Boolean(j.urgent),
      isActive: Boolean(j.isActive),
      applicants: bookingRows
        .filter((b) => b.jobId === j.id)
        .map((b) => ({ ...b, verified: Boolean(b.verified) })),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load your jobs' });
  }
});

// Confirm, reject or complete an application, but only on the employer's own job
router.put('/bookings/:id', requireSession('employer'), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT j.employerId FROM bookings b JOIN jobs j ON j.id = b.jobId WHERE b.id = ?', [req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    if (rows[0].employerId !== req.session.id) {
      return res.status(403).json({ error: 'That application is for someone else\'s job' });
    }
    return bookings.updateBooking(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

module.exports = router;
