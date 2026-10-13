const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('FundiLink API is running'));

app.use('/users', require('./server/routes/users'));
app.use('/jobs', require('./server/routes/jobs'));
app.use('/bookings', require('./server/routes/bookings'));

// Unknown routes return JSON, not Express's HTML page
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Return contract-shaped errors instead of Express's HTML page
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
