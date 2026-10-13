const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('FundiLink API is running'));

app.use('/users', require('./server/routes/users'));
app.use('/jobs', require('./server/routes/jobs'));
app.use('/bookings', require('./server/routes/bookings'));

module.exports = app;