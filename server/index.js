const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('FundiLink API is running');
});

const userRoutes = require('./server/routes/users');
const jobRoutes = require('./server/routes/jobs');
const bookingRoutes = require('./server/routes/bookings');

app.use('/users', userRoutes);
app.use('/jobs', jobRoutes);
app.use('/bookings', bookingRoutes);

// Return contract-shaped errors instead of Express's HTML page
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});