-- FundiLink API database: creates the database, its tables and sample data.
-- Run from the server/ folder:   mysql -u root -p < schema.sql
-- Safe to re-run: it drops and recreates the tables, resetting them to the sample data below.

CREATE DATABASE IF NOT EXISTS fundilink;
USE fundilink;

DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  firstName  VARCHAR(100) NOT NULL,
  lastName   VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('worker', 'employer') NOT NULL,
  trade      VARCHAR(100) NULL,
  location   VARCHAR(255) NULL,
  verified   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE jobs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  category    VARCHAR(100) NOT NULL,
  location    VARCHAR(255) NOT NULL,
  pay         DECIMAL(10, 2) NOT NULL,
  payType     VARCHAR(50) NOT NULL DEFAULT 'fixed',
  urgent      BOOLEAN NOT NULL DEFAULT FALSE,
  duration    VARCHAR(100) NULL,
  employerId  INT NULL,
  employer    VARCHAR(255) NULL,
  description TEXT NULL,
  isActive    BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (employerId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE bookings (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  jobId      INT NOT NULL,
  workerId   INT NOT NULL,
  workerName VARCHAR(255) NULL,
  status     ENUM('pending', 'confirmed', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
  appliedAt  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (workerId) REFERENCES users(id) ON DELETE CASCADE
);

-- Sample data. Passwords are stored hashed (scrypt); every sample user's password is: password123
INSERT INTO users (firstName, lastName, email, password, role, trade, location, verified) VALUES
  ('John',  'Kamau',   'john@example.com',  'scrypt$96de3f860858cf8f92ec6267b26e2d5c$85daf14c2f5737b12b6d5080f303fbd7f1599fb3ea2f5b4f470f525232328f3ea8dd2a5fea4560d7fc5f3bfdc7040c516a9cf2d17991ecab72e186f662c2d01e', 'worker',   'plumbing',   'Westlands, Nairobi',  TRUE),
  ('Peter', 'Mwangi',  'peter@example.com', 'scrypt$2a6589a0da5034070efd88c0ab90c283$d7e718ae55066a76a4c62f26c2fdc915fd4b47fd872a62adcbd0d8237cbd090096069981cf88fb935f534e94c4fbc5669604bbae1fb1b6ec8401e74442519acc', 'employer', NULL,         'Kilimani, Nairobi',   TRUE),
  ('Grace', 'Wanjiru', 'grace@example.com', 'scrypt$2e2d7bddb76063f5974d9fff717cbe19$389fe3a799168b341a25ccbb76b9c3f2fcc1dfc53896ac6322c16b41e36d79056dec2413ae437f19f69a4312b5d500f0d98df20910d353ca4c7fc0e7542a6aee', 'worker',   'cleaning',   'Kileleshwa, Nairobi', TRUE),
  ('Brian', 'Otieno',  'brian@example.com', 'scrypt$46d435e0d4f7a765f31bcb06898ffd3e$b435bfd8315037496fee5a3744bfe42cb46674b9fb7546b90ff488f3ad52edfdd691a7eba2f212f009291a6be094d6ab291a290d4e9ad6c90cefa0101a77785d', 'worker',   'electrical', 'Westlands, Nairobi',  FALSE);

INSERT INTO jobs (title, category, location, pay, payType, urgent, duration, employerId, employer, description) VALUES
  ('Fix leaking kitchen sink', 'plumbing', 'Westlands, Nairobi', 1500, 'fixed', TRUE,  '~2 hours', 2, 'Peter Mwangi',
   'The kitchen sink has been dripping for 3 days. Need someone to replace the tap washer.'),
  ('Deep clean 2-bedroom flat', 'cleaning', 'Kilimani, Nairobi', 2500, 'fixed', FALSE, '1 day',    2, 'Peter Mwangi',
   'Move-out clean: kitchen, bathroom, floors and windows.');

INSERT INTO bookings (jobId, workerId, workerName, status, appliedAt) VALUES
  (1, 1, 'John Kamau',    'pending',   '2026-09-09 07:15:00'),
  (2, 3, 'Grace Wanjiru', 'confirmed', '2026-09-10 09:30:00');
