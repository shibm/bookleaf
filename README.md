# BookLeaf Author Support

A complete author and operations support portal using **React, Node.js/Express, MongoDB and Mongoose**. Authors see their own books and royalties, submit queries, and follow conversations. Admins triage tickets, review AI suggestions, edit replies, manage status/assignment, and add private notes. Conversation updates arrive every four seconds without refreshing.

## Run locally

Requires **Node.js 24+**, npm, and MongoDB (local or Atlas).

```sh
npm ci
cp .env.example .env
```

Edit `.env` and replace `MONGODB_URI` with your connection string:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/bookleaf
# Or your Atlas URI, including the database name:
# MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@YOUR-CLUSTER.mongodb.net/bookleaf
```

When a connection string omits its database name, the app uses `bookleaf` instead of MongoDB’s default `test` database. Set optional `MONGODB_DB_NAME` to override the database explicitly. Existing data in other databases is left untouched.

URL-encode special characters in Atlas credentials and allow your application's IP in Atlas Network Access. Keep the real connection string in `.env`; it is excluded from Git and the source ZIP.

If you want a local MongoDB through Docker:

```sh
docker compose up -d mongo
```

Then seed, build and run:

```sh
npm run seed
npm run build
npm start
```

Open **http://localhost:3000**. The default `.env.example` also sets `SEED_DEMO=true`, so startup seeds missing demo records. The seed command is safe to repeat: existing accounts, passwords and books are retained. No fake support tickets are inserted.

For React development, use two terminals after configuring MongoDB:

```sh
# Terminal 1 — backend, localhost:3000
npm run dev:server
# Terminal 2 — React/Vite, localhost:5173
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` and `/health` to the backend port set by `PORT` in `.env` (3000 by default). Run only one backend at a time: use either `npm start` or `npm run dev:server`. If you change `PORT`, restart both the backend and Vite. Production needs only `npm run build` followed by `npm start`.

## Demo accounts

| Role                           | Email                      | Password          |
| ------------------------------ | -------------------------- | ----------------- |
| Author                         | `priya.sharma@email.com`   | `AuthorDemo!2026` |
| Author with a production title | `sneha.kulkarni@email.com` | `AuthorDemo!2026` |
| Admin                          | `admin@bookleaf.com`       | `AdminDemo!2026`  |

All 10 author emails in `data/sample-data.json` work with the same author demo password. `DEMO_AUTHOR_PASSWORD` and `DEMO_ADMIN_PASSWORD` affect newly seeded accounts only. Use a fresh demo database to seed with different passwords. Never use these public demo passwords for real accounts.

## Features

- Author login, account isolation, all 18 supplied books, INR royalty figures and honest handling of null production fields.
- Book-specific or general queries; status tracking and public follow-up messages.
- Paginated admin queue with status/category/priority/date filters; unresolved urgent tickets and oldest tickets first.
- Automatic AI category, urgency and response draft, with editable human overrides.
- Self-assignment, status management, private internal notes and optimistic concurrency checks.
- Cached drafts, four-second polling, responsive layouts, clear empty states and visible fallback mode.
- Cookie sessions persisted in MongoDB, salted scrypt passwords, CSRF protection, role/ownership checks, security headers and rate limiting.

## AI configuration and behavior

Set `OPENAI_API_KEY` in `.env` to enable OpenAI. It is used only by the server. `OPENAI_MODEL` defaults to `gpt-4o-mini`, the economical model suggested in the assignment; change it to a compatible structured-output model available to your account. No API key is required to run the complete portal in policy-template fallback mode.

A single Responses API call produces a strict JSON object containing category, priority, draft and rationale. The server validates the response before storing it. The prompt combines shared tone/safety instructions, a category-relevant policy section, the query, the author's first name, and the selected book. It excludes contact details, bank details, other authors, internal notes and ticket history. User content is marked as untrusted input. Model drafts are suggestions: the admin explicitly inserts, edits and sends them.

Policies cover the 80/20 **net profit** split, quarterly/45-day cycle, ₹1,000 rollover threshold, ISBN escalation, verified free reprints, distribution sync, production stages and metadata updates. The available data cannot establish bank linkage, platform-level sales or a specific next payout date, so those are never calculated from aggregate balances.

Cost controls: one initial combined call per query, relevant policy retrieval rather than full history, capped input/output, persisted drafts, per-process job deduplication and rate-limited explicit regeneration. `store:false` disables response storage by the Responses endpoint; external processing still occurs when enabled. The provider timeout defaults to 12 seconds. Errors, rate limits, refusal/incomplete responses and malformed output produce a labeled deterministic fallback. Tickets are saved before AI starts, and manual replies remain available. Pending jobs are recovered on server restart. Human category and priority overrides survive late AI results.

Implementation references: [official OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses). Live API behavior requires your key and model access; provider success/failure paths are covered with mocked responses.

## Structure and schema

```text
client/                 React SPA, API client, responsive styles
src/app.js              Express composition and middleware wiring
src/routes/             Resource routers and endpoint authorization
src/controllers/        HTTP request/response handling
src/middleware/         Authentication, CSRF, rate limits and errors
src/config/             Database connection and persistent session configuration
src/utils/              Password hashing, HTTP errors and input validation
src/models/             Separate User, Book, Ticket and Message schemas/indexes
src/database/           Idempotent demo seeding
src/services/           Ticket workflows, queue queries, AI jobs and knowledge base
src/server.js           Startup, recovery and graceful shutdown
scripts/                Repeatable seed and source ZIP packaging
data/sample-data.json  Exact supplied sample dataset
test/                  Node integration and AI tests
e2e/                   Browser smoke test
docs/                  API contract and one-page approach note
```

MongoDB collections: users (original author IDs and salted password hashes), books (original IDs and exact sample fields), tickets (references, classification, assignment, draft, version and timestamps), messages (public/internal visibility) and sessions (TTL-managed by connect-mongo). Mongoose enforces enums and required fields; indexes cover ownership, queue filtering, message lookup and email uniqueness. Ticket bodies have explicit request validation, and ownership is checked at the API boundary.

See [API documentation](docs/API.md) for every endpoint, payload, filter and error. See [Approach and assumptions](docs/APPROACH.md) for the brief write-up and production trade-offs.

## Verification

```sh
npm test
npm run build
npm run test:e2e
```

**Verified:** production build, all 12 backend/AI tests, and the Chrome browser conversation workflow (including mobile navigation) pass.

`npm test` launches an isolated, temporary MongoDB via mongodb-memory-server and does not use your `MONGODB_URI`. The first run downloads a MongoDB binary and needs internet access. Tests cover seed fidelity/idempotency, login/CSRF/RBAC, cross-author access, private-note redaction, ticket lifecycle, queue filters, conflicts, late AI results, prompt boundaries and provider degradation. Browser tests use an isolated MongoDB as well. On macOS, browser tests use installed Google Chrome. On other systems run `npx playwright install chromium` once. See `playwright.config.js` for the browser setup.

## Deployment

Source delivery is complete; no public deployment or collaborator invitation has been performed. Deploy the Node app to a host supporting Node 24 or the included Dockerfile, with an Atlas database accessible from the host:

- Build command: `npm ci && npm run build`.
- Start command: `npm start`.
- Environment: `MONGODB_URI`, `SESSION_SECRET` (32+ random characters), `NODE_ENV=production`, `PORT` supplied by the host, optional `OPENAI_API_KEY`/`OPENAI_MODEL`.
- Use HTTPS. Production session cookies are secure; set `TRUST_PROXY=true` only behind a trusted single reverse proxy terminating HTTPS.
- Set `SEED_DEMO=true` only for a dedicated evaluation database; disable it for real deployments and provision real accounts. The startup seed is idempotent.
- Health check: `/health`. MongoDB stores records and sessions outside the application container; ephemeral application files are fine.

The Dockerfile builds the React bundle and runs Express as the unprivileged `node` user. Docker build/deployment has not been verified in this environment.

## Limitations and assumptions

- No live LLM call was made without a supplied key. Fallback mode is explicitly labeled.
- File attachments are a disabled UI placeholder; no file is uploaded or falsely acknowledged.
- Sales/royalty values are aggregate sample snapshots, not a ledger. Sample ISBN placeholders are preserved verbatim. Production books retain null dates/prices.
- Replies reopen resolved tickets; closed tickets require a new author query.
- In-process AI work and rate limiting target a single instance. Multi-instance deployment needs a durable shared queue and shared rate-limit store.
- Public reply insertion and ticket activity updates are separate Mongo operations; use replica-set transactions/outbox for stronger consistency in production.
- Account registration, password reset, actual payout/metadata mutations, outbound email and file storage are outside this assignment implementation.
- Optional Google Fonts improve typography; system fallbacks work without internet.

## Source ZIP

```sh
npm run package
```

Creates `artifacts/bookleaf-support.zip`, including source, documentation, sample data, lockfile and built React assets, excluding `.env`, runtime data and dependencies. Extract, configure `.env`, and follow the setup steps above.
