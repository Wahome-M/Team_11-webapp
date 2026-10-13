# Blind Test Report: Week 8

## Setup

- **Our API:** FundiLink API. It runs locally; for the blind test we exposed it with a temporary Cloudflare tunnel.
- **Team that tested our README:** the StudySync team ([Lincoln-lema/StudySync-webapp](https://github.com/Lincoln-lema/StudySync-webapp))
- **Outside our ring?** Yes. They had never worked with our API before.
- **What we sent them:** only the repo link (`README.md`, plus `docs/index.html` in the repo) and the tunnel base URL `https://grew-anderson-cookies-carol.trycloudflare.com`. No verbal explanation, and no answers to questions.
- **Team whose README we tested:** the same StudySync team (swap in both directions).

## 1. What happened when our README was tested

- **Did they succeed?** Yes. Their first call, `GET /jobs`, returned `200` with the two sample jobs.
- **How long it took:** about **4 minutes**. We sent the URL at about 23:14 EAT and they had a working response at 23:18 EAT (2026-10-13).
- **Where they got stuck:** nowhere. They reported no blockers and asked us no questions.
- **The one adaptation they made:** every README example uses `http://localhost:5000`, so they had to swap in the tunnel URL. They said this was easy because only the host changes; our routes have no `/api` prefix.

**What this test did *not* check.** Because the testers used our tunnel, they never followed the "run it locally" steps (MySQL, `schema.sql`, `.env`, `npm start`). Those steps were checked separately:

- We followed the README word for word from a clean copy in a fresh Linux environment. Every setup step worked, every example `curl` returned exactly the documented response, and every row of the error table matched.
- One of us ran the same steps on a Mac with existing MySQL. It worked, but port 5000 is taken by macOS AirPlay, so the API had to run on port 5001. The README already warns about this, and that warning was the fix we used.

## 2. What we fixed, and what's still a gap

**Fixed while preparing the docs, before the swap:**

- **`npm start` crashed on a fresh clone** (`ReferenceError: cors is not defined`) after the last merge. Fixed in `server/index.js`; `app.js` now holds all routes and middleware.
- **No way to create the database from a clean clone.** Added `server/schema.sql` (tables plus sample data) and `server/.env.example`.
- **`openapi.yaml` described only 5 of our 12 endpoints**, and its error examples didn't match real responses. Updated it, rebuilt `docs/index.html` (Redoc, opens offline), and logged the changes in `CONTRACT_DEVIATIONS.md`.
- **Bad input to `POST /bookings` and `PUT /bookings/{id}` returned 500.** These now return 400 or 404 with a clear message.
- **Added Mac guidance.** The README now includes a port-5000 (AirPlay) warning and a troubleshooting table.

**Changed after the blind test:**

- **Added a line to the README examples section** saying that if you're given a hosted URL, you replace `http://localhost:5000` with it and the paths stay the same. The testers managed this without help, so this wasn't a failure. We added it because it was the only step where they had to work something out for themselves.

**Known gaps we didn't close today:**

- **No permanent live URL.** The API only runs locally or through a temporary tunnel, and the tunnel URL changes whenever it restarts.
- **Local setup requires MySQL.** For a tester who doesn't have it, installing MySQL is the slowest step. The README covers it, but no outside tester has tried it yet.
- **`POST /jobs` validation is weaker than in Week 6.** It returns one combined message and accepts `pay: 0`. This is noted in `CONTRACT_DEVIATIONS.md`.

## 3. Honest summary

Our README passed the blind test. A team outside our ring, with no prior context and no help from us, made a successful `GET /jobs` call against our live API in about four minutes, and reported no point where they got stuck. The caveat is that they reached the API through our tunnel, so this test proved the endpoint documentation and examples work for a stranger, but not the local-setup instructions. We checked those ourselves from a clean environment and on a Mac. Neither of us is a true stranger, though, so the setup section is the part of our docs still waiting for a real blind test. Before the swap, our own check found two problems that would have stopped any tester on step one: the server crashed on start, and there was no way to create the database. Fixing those mattered more than anything in the examples.

## Appendix: us testing their README (StudySync API)

- **Did we get a successful call?** Yes. `GET /api/members` returned `200` with three members.
- **Time:** about 7 minutes, from opening their README at about 22:56 EAT to the first `200` at 23:03 EAT.
- **What we did:** cloned the repo, ran `npm install`, followed `SETUP.md` steps 2–3 for the database, created `server/.env` from their example, and ran `npm start` on a Mac.

| Step | What happened | Did their README cover it? |
|---|---|---|
| Clone and `npm install` | Worked | Yes |
| Database setup | Worked | Partly. The README sends you to `SETUP.md` for this step instead of including it |
| `npm start` on port 5000 | `curl` returned nothing; `curl -i` showed `403 Forbidden` from `Server: AirTunes` (macOS AirPlay owns port 5000) | **No.** There is no warning for Mac users, and the empty reply gives no clue what went wrong |
| Set `PORT=5001` in `.env` and restarted | `GET /api/members` returned `200` | The workaround isn't documented |
| Compared the response with the README quickstart | Anna came back with `"initials":"A"` and `"reliability":95`, but the README shows `"AN"` and `85` | **No.** The example doesn't match the setup data |

**Gaps we'd flag to them:**

1. **Add a Mac port-5000 (AirPlay) warning.** This was the only real blocker. A reasonable person following the README exactly would get a silent empty reply and be stuck.
2. **Put the database steps in the README itself**, rather than splitting them across `SETUP.md` and a `schema_additions.sql` the README mentions but never says to run.
3. **Make the quickstart example match the seed data** (initials and reliability).
4. **Resolve the contradictions between README and `SETUP.md`:** `npm start` vs `npm run dev`, and `/api/deadlines` with no dates (`SETUP.md`) vs `from`/`to` being required (README).
