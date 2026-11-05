# AGENTS.md

Express 5 + MongoDB (driver v7, no ODM) backend. ESM only (`"type": "module"`) — relative imports must include the `.js` extension.

## Commands

- `npm run dev` — nodemon on `dev.js`, which is the only place that calls `app.listen` (port defaults to 5000). Main workflow; there is no test/lint/typecheck setup.
- `npm start` runs `server.js`, which no longer listens — it just imports and re-exports the app for `api/index.js` (Vercel). Running it locally connects to the DB and then exits; use `npm run dev` locally.

## Gotchas

- **Importing `src/app.js` opens a DB connection**: `connectToMongoDB()` runs at module top level via top-level `await`, and `db.collection(...)`, index creation, etc. all execute on import. Requires `MONGODB_URI` and `CLIENT_URL` in `.env` (present, gitignored). Do not import `app.js` casually from scripts/tests.
- **Vercel deploys via `api/index.js`**: it re-exports `server.js` (which re-exports `src/app.js`); `vercel.json` rewrites all requests to `/api`. `MONGODB_URI` must be set in the Vercel project's env vars (the gitignored `.env` only works locally). Cold starts re-import `app.js`, so every cold start re-runs the DB connect and index creation — that's expected, keep them idempotent.
- **Auth is JWT verification, not sessions**: mutating routes (`POST /events`, `PATCH/DELETE /events/:id`, join/leave) run the `varifyToken` middleware (sic), which verifies a Bearer token with `jose` against a remote JWKS fetched from `process.env.CLIENT_URL` — yes, that var is the JWKS URL, not the app's base URL. Route order matters: define new mutating routes with `varifyToken` to match.
- **`PATCH /events/:id` expects the update payload wrapped as `req.body.data`**, not spread directly on the body; `userEmail` for ownership comes separately on the body.
- **Emails are always normalized** with `toLowerCase().trim()` before comparing or storing (`userEmail`, `createdBy`). Keep this for any new endpoint involving user identity.
- **Collection names**: events live in `user-events`, participation records in `join-events` (DB `kindora-db`). Variables named `eventCollaction` and `participleCollaction` (sic) are the existing names — stay consistent.
- **Unique index**: `join-events` has a unique compound index on `{ eventId, userEmail }`; duplicate joins throw code `11000`, which handlers map to 409.

## Conventions

- Responses use a `{ success, message, data }` envelope. Exceptions: `GET /events` returns a bare array and `GET /events/:id` returns a bare object. When adding endpoints, use the envelope unless intentionally matching a raw response.
- All routes are defined inline in `src/app.js` (single ~530-line file). Follow that pattern unless the file grows.
- Last-write-wins authorization: mutations filter by `{ _id, createdBy: email }` — ownership still uses the client-supplied email, not the verified token. Exception: `DELETE /events/:id/join` takes the email from `req.user.email` (verified token).
