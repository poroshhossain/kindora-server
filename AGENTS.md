# AGENTS.md

Express 5 + MongoDB (driver v7, no ODM) backend. ESM only (`"type": "module"`) — relative imports must include the `.js` extension.

## Commands

- `npm run dev` — nodemon on `server.js` (main workflow; there is no test/lint/typecheck setup).
- `npm start` — plain node; listens on `process.env.PORT` or 5000.

## Gotchas

- **Importing `src/app.js` opens a DB connection**: `connectToMongoDB()` runs at module top level via top-level `await`, and `db.collection(...)`, index creation, etc. all execute on import. Requires `MONGODB_URI` and `PORT` in `.env` (present, gitignored). Do not import `app.js` casually from scripts/tests.
- **Vercel deploys via `api/index.js`**: it just re-exports `src/app.js`; `vercel.json` rewrites all requests to `/api`. `server.js`'s `app.listen` is ignored serverless. `MONGODB_URI` must be set in the Vercel project's env vars (the gitignored `.env` only works locally). Cold starts re-import `app.js`, so every cold start re-runs the DB connect and index creation — that's expected, keep them idempotent.
- **Emails are always normalized** with `toLowerCase().trim()` before comparing or storing (`userEmail`, `createdBy`). Keep this for any new endpoint involving user identity.
- **Collection names**: events live in `user-events`, participation records in `join-events` (DB `kindora-db`). Variables named `eventCollaction` and `participleCollaction` (sic) are the existing names — stay consistent.
- **Unique index**: `join-events` has a unique compound index on `{ eventId, userEmail }`; duplicate joins throw code `11000`, which handlers map to 409.

## Conventions

- Responses use a `{ success, message, data }` envelope. Exceptions: `GET /events` returns a bare array and `GET /events/:id` returns a bare object. When adding endpoints, use the envelope unless intentionally matching a raw response.
- All routes are defined inline in `src/app.js` (single ~450-line file). Follow that pattern unless the file grows.
- Last-write-wins authorization: mutations filter by `{ _id, createdBy: email }` — no auth middleware; the client-supplied email is the ownership check.
