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

-- Sample data (passwords are plain text for now; real auth arrives in Week 9)
INSERT INTO users (firstName, lastName, email, password, role, trade, location, verified) VALUES
  ('John',  'Kamau',   'john@example.com',  'password123', 'worker',   'plumbing',   'Westlands, Nairobi',  TRUE),
  ('Peter', 'Mwangi',  'peter@example.com', 'password123', 'employer', NULL,         'Kilimani, Nairobi',   TRUE),
  ('Grace', 'Wanjiru', 'grace@example.com', 'password123', 'worker',   'cleaning',   'Kileleshwa, Nairobi', TRUE),
  ('Brian', 'Otieno',  'brian@example.com', 'password123', 'worker',   'electrical', 'Westlands, Nairobi',  FALSE);

INSERT INTO jobs (title, category, location, pay, payType, urgent, duration, employerId, employer, description) VALUES
  ('Fix leaking kitchen sink', 'plumbing', 'Westlands, Nairobi', 1500, 'fixed', TRUE,  '~2 hours', 2, 'Peter Mwangi',
   'The kitchen sink has been dripping for 3 days. Need someone to replace the tap washer.'),
  ('Deep clean 2-bedroom flat', 'cleaning', 'Kilimani, Nairobi', 2500, 'fixed', FALSE, '1 day',    2, 'Peter Mwangi',
   'Move-out clean: kitchen, bathroom, floors and windows.');

INSERT INTO bookings (jobId, workerId, workerName, status, appliedAt) VALUES
  (1, 1, 'John Kamau',    'pending',   '2026-09-09 07:15:00'),
  (2, 3, 'Grace Wanjiru', 'confirmed', '2026-09-10 09:30:00');
