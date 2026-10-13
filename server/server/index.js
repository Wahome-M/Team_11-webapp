// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();
 
// const app = express();
// const PORT = process.env.PORT || 5000;

// const app = require('./app');
// app.listen(5000, () => console.log('Server running on 5000'));
 
// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'accept']
// }));
// app.use(express.json());
 
// app.get('/', (req, res) => {
//   res.send('API is running');
// });
 
// const userRoutes = require('./routes/users');
// app.use('/users', userRoutes);

// const jobRoutes = require('./routes/jobs');
// const bookingRoutes = require('./routes/bookings');
// app.use('/jobs', jobRoutes);
// app.use('/bookings', bookingRoutes); 

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

// if (require.main === module) {
//   app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
//   });
// }

// module.exports = app;