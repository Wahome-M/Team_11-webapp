# Blind Test Report: Week 8

> Fill in every `TODO` with what actually happened. If the other team never got a working response, say so plainly; "it didn't work" is a valid result.

## Setup

- **Our API:** FundiLink API (runs locally; testers clone the repo and follow `README.md`)
- **Team that tested our README:** TODO (team name/number)
- **Were they outside our ring?** TODO (yes / no; if no, explain the substitution and confirm they had no prior context on our API)
- **What we sent them:** the repo link only (`README.md` + `docs/index.html`). No verbal explanation.
- **Team whose README we tested:** TODO

## 1. What happened when our README was tested

- **Did they get a successful response?** TODO (yes / no). Which request: TODO (e.g. `curl http://localhost:5000/jobs`)
- **Time from starting to first successful response:** TODO minutes
- **Where they got stuck, in order:**

| Step in our README | What they did / saw | Why (our docs' fault or not) |
|---|---|---|
| TODO (e.g. Quickstart step 3, `mysql -u root -p < schema.sql`) | TODO (exact error or confusion) | TODO |
| | | |

- **Things they skipped or misread:** TODO

## 2. What we fixed, and what's still a gap

**Fixed before the swap** (found while preparing the docs):

- `npm start` crashed on a fresh clone (`ReferenceError: cors is not defined`) after the last merge. Fixed in `server/index.js`.
- No way to create the database from a clean clone. Added `server/schema.sql` (tables + sample data) and `server/.env.example`.
- `openapi.yaml` described only 5 of our 12 endpoints, and its error examples didn't match real responses. Updated it, rebuilt `docs/index.html`, and logged the changes in `CONTRACT_DEVIATIONS.md`.
- Bad input to `POST /bookings` / `PUT /bookings/{id}` returned 500. It now returns 400/404 with a clear message.
- Added a Mac port-5000 (AirPlay) warning and a troubleshooting table to the README.

**Fixed after the blind test:**

- TODO

**Known gaps we didn't close today:**

- The API only runs locally. A tester must install MySQL, which is the slowest step for someone who doesn't have it.
- TODO

## 3. Honest summary

TODO: One paragraph. Did a stranger get a working response from our README alone? If yes, how smoothly? If not, where exactly did it break, and was that our docs or their environment? (Rule of thumb from the handout: if a reasonable person followed the README exactly and still got stuck, it's a docs gap.)

## Appendix: us testing their README

- **Did we get a successful call?** TODO
- **Where we got stuck:** TODO
