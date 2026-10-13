# FundiLink API

FundiLink connects people in Nairobi who need short-term work done (plumbing, cleaning, painting and so on) with local casual workers ("fundis"). This API is the backend: **employers** post jobs, **workers** apply to them (an application is called a **booking**), and employers confirm or reject each booking. It's for anyone building a FundiLink client, such as our web frontend or a mobile app.

- Full endpoint reference (every field, every response): open **[`docs/index.html`](docs/index.html)** in your browser. No setup needed; just double-click the file after cloning.
- Contract source: [`openapi.yaml`](openapi.yaml)

---

## Quickstart (about 5 minutes)

You need **Node.js 18+**, **git**, and **MySQL 8** (MariaDB 10.5+ also works) installed and running.

<details>
<summary>Don't have MySQL yet? Click here.</summary>

- **Mac:** `brew install mysql` then `brew services start mysql`. The `root` user has **no password**; press Enter when asked for one.
- **Windows:** install "MySQL Installer" from <https://dev.mysql.com/downloads/installer/>, choose *Server only*, and set a root password you'll remember. Use **Git Bash** (installed with git) for all commands below.
- **Linux:** `sudo apt install mysql-server`

Check it's working: `mysql -u root -p -e "SELECT 1;"` should print `1`.
</details>

Run these from a terminal, in order:

```bash
# 1. Get the code and go into the API folder
git clone https://github.com/Wahome-M/Team_11-webapp.git
cd Team_11-webapp/server

# 2. Install dependencies
npm install

# 3. Create the database, tables and sample data (enter your MySQL root password; just press Enter if you have none)
mysql -u root -p < schema.sql

# 4. Create your settings file
cp .env.example .env
```

**Step 5:** open `server/.env` in any editor. If your MySQL root user has a password, put it after `DB_PASSWORD=`. If not, leave it blank. Save.

```bash
# 6. Start the API
npm start
```

You should see `Server running on http://localhost:5000`. Leave this terminal open, open a **second terminal**, and run:

```bash
curl http://localhost:5000/jobs
```

You should get a JSON array with two jobs ("Fix leaking kitchen sink" and "Deep clean 2-bedroom flat"). If you do, everything works. If not, see [Troubleshooting](#troubleshooting).

> **Mac users:** if `npm start` says `EADDRINUSE`, or `curl` returns `403 Forbidden`, macOS AirPlay is using port 5000. Set `PORT=5001` in `server/.env`, restart with `npm start`, and use `5001` instead of `5000` in every command below.

---

## Authentication

**There is none yet.** Every endpoint is open: no token, API key or `Authorization` header is needed. Real authentication arrives in Week 9.

`POST /users/login` exists, but it only checks an email and password and returns that user. It does **not** return a token, and you don't need to call it before other requests.

---

## Examples: one per endpoint

All requests and responses below were captured from a freshly set-up database. Run them **in this order** and your IDs will match. To reset to the starting data at any time, stop the server, re-run `mysql -u root -p < schema.sql`, and start it again.

Every request with a body needs the header `Content-Type: application/json`.

**Given a hosted URL instead of running it yourself** (e.g. `https://something.trycloudflare.com`)? Replace `http://localhost:5000` with that URL in every command. The paths stay the same, and there is no `/api` prefix: `https://something.trycloudflare.com/jobs`.

**Sample data you start with**

| Users | Jobs | Bookings |
|---|---|---|
| 1 John Kamau (worker, plumbing) · 2 Peter Mwangi (employer) · 3 Grace Wanjiru (worker, cleaning) · 4 Brian Otieno (worker, electrical, unverified) | 1 Fix leaking kitchen sink · 2 Deep clean 2-bedroom flat | 1 John → job 1 (pending) · 2 Grace → job 2 (confirmed) |

All sample users have the password `password123`.

### Jobs

**Browse active jobs** (optional filter: `?category=plumbing`)

```bash
curl "http://localhost:5000/jobs?category=plumbing"
```
`200 OK`
```json
[
  {
    "id": 1,
    "title": "Fix leaking kitchen sink",
    "category": "plumbing",
    "location": "Westlands, Nairobi",
    "pay": 1500,
    "payType": "fixed",
    "urgent": true,
    "duration": "~2 hours",
    "employerId": 2,
    "employer": "Peter Mwangi",
    "description": "The kitchen sink has been dripping for 3 days. Need someone to replace the tap washer.",
    "isActive": true
  }
]
```

**Post a new job.** `title`, `category`, `location` and `pay` (a number, not a string) are required.

```bash
curl -X POST http://localhost:5000/jobs \
  -H "Content-Type: application/json" \
  -d '{"title":"Paint front gate","category":"painting","location":"Kilimani, Nairobi","pay":2000,"employerId":2}'
```
`201 Created`
```json
{
  "id": 3,
  "title": "Paint front gate",
  "category": "painting",
  "location": "Kilimani, Nairobi",
  "pay": 2000,
  "payType": "fixed",
  "urgent": false,
  "duration": null,
  "employerId": 2,
  "employer": null,
  "description": null,
  "isActive": true
}
```

**See who applied to a job**

```bash
curl http://localhost:5000/jobs/1/bookings
```
`200 OK`
```json
[
  { "id": 1, "jobId": 1, "workerId": 1, "workerName": "John Kamau", "status": "pending", "appliedAt": "2026-09-09T04:15:00.000Z" }
]
```

### Bookings

**Apply to a job.** `jobId` and `workerId` are required and must already exist.

```bash
curl -X POST http://localhost:5000/bookings \
  -H "Content-Type: application/json" \
  -d '{"jobId":1,"workerId":4,"workerName":"Brian Otieno"}'
```
`201 Created`
```json
{ "id": 3, "jobId": 1, "workerId": 4, "workerName": "Brian Otieno", "status": "pending", "appliedAt": "2026-10-13T18:43:17.000Z" }
```

**Confirm a booking.** `status` must be `pending`, `confirmed`, `rejected` or `completed`.

```bash
curl -X PUT http://localhost:5000/bookings/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}'
```
`200 OK`
```json
{ "id": 1, "jobId": 1, "workerId": 1, "workerName": "John Kamau", "status": "confirmed", "appliedAt": "2026-09-09T04:15:00.000Z" }
```

**Check one booking**

```bash
curl http://localhost:5000/bookings/1
```
`200 OK`: the same object as above, now with `"status": "confirmed"`.

(`appliedAt` is in UTC. On your machine the hour may differ, depending on your timezone.)

### Users

**Search users.** Every filter is optional: `role`, `trade`, `location` (partial match) and `verified`.

```bash
curl "http://localhost:5000/users?role=worker&verified=true&location=westlands"
```
`200 OK`
```json
[
  { "id": 1, "firstName": "John", "lastName": "Kamau", "email": "john@example.com", "role": "worker", "trade": "plumbing", "location": "Westlands, Nairobi", "verified": true }
]
```

**Get one user**

```bash
curl http://localhost:5000/users/1
```
`200 OK`: the John Kamau object above.

**Register.** `firstName`, `lastName`, `email` (unique), `password` and `role` (`worker` or `employer`) are required.

```bash
curl -X POST http://localhost:5000/users \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Amina","lastName":"Hassan","email":"amina@example.com","password":"secret1","role":"worker","trade":"painting","location":"South B, Nairobi"}'
```
`201 Created` (the password is never returned)
```json
{ "id": 5, "firstName": "Amina", "lastName": "Hassan", "email": "amina@example.com", "role": "worker", "trade": "painting", "location": "South B, Nairobi", "verified": false }
```

**Log in** (checks credentials only; no token yet)

```bash
curl -X POST http://localhost:5000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```
`200 OK`: the John Kamau user object.

**Update a user.** Send the full profile. `password` is optional and is kept if you leave it out.

```bash
curl -X PUT http://localhost:5000/users/5 \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Amina","lastName":"Hassan","email":"amina@example.com","role":"worker","trade":"painting","location":"South C, Nairobi","verified":true}'
```
`200 OK`: the updated user, now with `"location": "South C, Nairobi"` and `"verified": true`.

**Delete a user**

```bash
curl -i -X DELETE http://localhost:5000/users/5
```
`204 No Content`: empty body.

---

## Errors

**Success is always a 2xx status code.** Anything else is a failure, and the body is always JSON with an `error` field:

```json
{ "error": "Booking not found" }
```

Validation failures (`400`) add a `details` array with one entry per problem:

```json
{
  "error": "Validation failed",
  "details": [
    "jobId is required and must be a positive integer",
    "workerId is required and must be a positive integer"
  ]
}
```

| Status | Meaning | Example request that causes it | `error` |
|---|---|---|---|
| 400 | Missing or invalid field | `POST /jobs` with `"pay":"2000"` (a string) | `Validation failed` + `details` |
| 400 | Body isn't valid JSON | `POST /jobs` with `{"title": "Fix sink",` | `Request body is not valid JSON` |
| 401 | Wrong email or password | `POST /users/login` with a wrong password | `Invalid email or password` |
| 404 | ID doesn't exist | `GET /bookings/9999` | `Booking not found` |
| 404 | No such route | `GET /nope` | `Route not found` |
| 409 | Email already registered | `POST /users` with `john@example.com` | `Email already registered` |
| 500 | Server or database problem | Any request while MySQL is stopped | e.g. `Failed to fetch jobs` |

Try one now:

```bash
curl -i http://localhost:5000/bookings/9999
```
```
HTTP/1.1 404 Not Found
...
{"error":"Booking not found"}
```

---

## Troubleshooting

| You see | Fix |
|---|---|
| `mysql: command not found` | MySQL isn't installed or isn't on your PATH. See the "Don't have MySQL yet?" box above. |
| `ERROR 1045 (28000): Access denied for user 'root'` | Wrong MySQL password. Use the root password you set when installing MySQL. |
| `npm start` says `EADDRINUSE` (Mac) | AirPlay is using port 5000. Set `PORT=5001` in `server/.env` and use port 5001 everywhere. |
| `curl` returns `403 Forbidden` (Mac) | Same AirPlay issue: switch to port 5001 as above. |
| Every request returns `500` with `Failed to fetch ...` | The API can't reach MySQL. Check MySQL is running and that `server/.env` has the right `DB_PASSWORD`. The server terminal shows the exact database error. |
| `curl: (7) Failed to connect to localhost port 5000` | The server isn't running. Start it with `npm start` in the `server` folder and keep that terminal open. |
| Your IDs don't match the examples | You've already created or deleted records. Reset with `mysql -u root -p < schema.sql`. |
| On Windows, `curl` with `-d '{...}'` fails | Use Git Bash, not PowerShell or Command Prompt. |

---

## Project layout

```
openapi.yaml          API contract (source for docs/index.html)
docs/index.html       Rendered API reference (Redoc). Opens offline.
server/
  index.js            Starts the server
  app.js              Routes and middleware
  schema.sql          Creates the database, tables and sample data
  .env.example        Settings template: copy to .env
  server/routes/      users.js, jobs.js, bookings.js
Casual-Worker-Sourcing-App/   Web frontend
```

To rebuild the docs page after changing `openapi.yaml`:

```bash
npx @redocly/cli build-docs openapi.yaml -o docs/index.html --title "FundiLink API Docs"
```
