// Jest settings so `npx jest` works from the repo root (after `npm install` here once).
// Tests: server/tests/ and Casual-Worker-Sourcing-App/src/_tests_/. They use the MySQL database
// in server/.env, so start MySQL first, and reset it afterwards with `node server/setup-db.js --yes`.
module.exports = {
  testEnvironment: 'node',
  transform: {}, // plain CommonJS: no Babel needed
  roots: ['<rootDir>/server/tests', '<rootDir>/Casual-Worker-Sourcing-App/src/_tests_'],
  forceExit: true, // the MySQL pool stays open after the tests; let Jest exit anyway
};
