// Entry point: loads settings, then starts the app defined in app.js.
// All routes and middleware live in app.js (so tests can import the app without starting a server).
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
