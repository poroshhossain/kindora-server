# Kindora Server

REST API for **Kindora** — a social development (volunteer-event) platform. Built with **Express 5** and **MongoDB** (native driver, no ODM). Fully ESM.

## Features

- Create, update (partial), and delete community events with duplicate-event protection
- Join / leave events with a unique compound index blocking duplicate participation
- "My events" and "Joined events" listings for each user
- JWT authentication on all mutating routes, verified against a remote JWKS
- Deployed serverless on Vercel

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Database | MongoDB (driver v7) |
| Auth | `jose` (remote JWKS JWT verification) |
| Config | `dotenv` |
| Dev | `nodemon` |

## Project Structure

```
kindora-server/
├── api/index.js   # Vercel serverless entry (re-exports the app)
├── server.js      # Shim for Vercel (re-exports src/app.js)
├── dev.js         # Local entrypoint — the only place that calls app.listen
└── src/app.js     # All middleware, DB wiring, and routes
```

Everything lives in a single Express app in `src/app.js`. Importing it opens a MongoDB connection at module top level.

## Getting Started

### Prerequisites

- Node.js (ESM support required)
- MongoDB connection string
- A JWKS endpoint serving the signing keys (e.g. Firebase)

### Environment Variables

Create a `.env` file:

```env
MONGODB_URI=<your MongoDB connection string>
CLIENT_URL=<JWKS endpoint URL used for JWT verification>
```

> ⚠️ `CLIENT_URL` is **not** the app's base URL — despite the name, it must point to the remote JWKS endpoint (e.g. `https://.../.well-known/jwks.json`). Note that `MONGODB_URI` must also be set in your Vercel project env vars for deployment.

### Install & Run

```bash
npm install
npm run dev    # nodemon + dev.js, serves on http://localhost:5000
```

## API Reference

All mutating endpoints require `Authorization: Bearer <token>`.

### Events

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | – | Health check |
| `GET` | `/events` | – | All events (newest first) |
| `GET` | `/recent-events` | – | 6 most recent events |
| `GET` | `/events/:id` | – | Single event by ID |
| `POST` | `/events` | ✅ | Create event (requires `title`, `description`, `eventType`, `thumbnail`, `location`, `eventDate`, `createdBy`) |
| `PATCH` | `/events/:id` | ✅ | Update — send the partial update as `{ "data": { ...fields } }`, plus `userEmail` for ownership |
| `DELETE` | `/events/:id` | ✅ | Delete event (owned via `userEmail` in body) |

### Event Participation

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/events/:id/join` | ✅ | Join — `userEmail` in body; 409 on duplicate |
| `DELETE` | `/events/:id/join` | ✅ | Leave — email is taken from the **verified token**, not the body |
| `GET` | `/joined-events?userEmail=` | – | Events a user joined, sorted by event date |
| `GET` | `/my-events?userEmail=` | – | Events created by a user, newest first |

### Response Envelope

Most endpoints return:

```json
{ "success": true, "message": "Event created successfully.", "data": {} }
```

Exceptions: `GET /events` returns a bare array and `GET /events/:id` returns a bare object.

### Error Codes

- `400` — missing/invalid fields or event ID
- `401` — missing token on protected routes
- `404` — event/record not found, or not owned by the supplied email
- `409` — duplicate join or duplicate event

## Deployment (Vercel)

- `vercel.json` rewrites all incoming requests to `/api`, which re-exports the Express app.
- The MongoDB connection and index creation re-run on every cold start — kept idempotent by design.
- Requires `MONGODB_URI` (and the JWKS `CLIENT_URL`) in the Vercel project environment settings.
