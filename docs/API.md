# REST API

All paths below start with `/api`. JSON requests and responses; successful responses use `{ "data": ... }`, failures use `{ "error": { "message": "..." } }`. List tickets also returns `meta: {page, limit, total}`. All endpoints except CSRF and login require a session. Unknown or inaccessible tickets return 404. Authors cannot submit or view another author's data. Admin-only endpoints return 403 to authors.

## Authentication and CSRF

1. `GET /auth/csrf` creates an anonymous session and returns `data.csrfToken`.
2. Send that value as `X-CSRF-Token` on every POST/PATCH, including login, and preserve the `bookleaf.sid` cookie.
3. `POST /auth/login` regenerates the session and returns a **new** CSRF token. Use the new value thereafter.

| Method | Path                    | Access         | Request / result                                                                                      |
| ------ | ----------------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| GET    | `/auth/csrf`            | Public         | `{data:{csrfToken}}`                                                                                  |
| POST   | `/auth/login`           | Public + CSRF  | `{email,password}` → `{data:{user,csrfToken}}`; 30 attempts per 15 minutes per IP                     |
| GET    | `/auth/me`              | Authenticated  | `{id,name,email,role}`                                                                                |
| POST   | `/auth/logout`          | Authenticated  | No body; destroys session; 204                                                                        |
| GET    | `/meta`                 | Authenticated  | Category, priority, status enums                                                                      |
| GET    | `/dashboard`            | Authenticated  | Scoped conversation counts and aggregate `earned`, `pending` royalty amounts                          |
| GET    | `/books`                | Authenticated  | Authors: own records; admins: all 18 records; original sample fields plus `author_id`                 |
| GET    | `/tickets`              | Authenticated  | Scoped, paginated ticket queue; filters below                                                         |
| POST   | `/tickets`              | Author         | `{book_id:null or "BK001",subject,description}` → 201 ticket; background AI begins after persistence  |
| GET    | `/tickets/:id`          | Owner or admin | Ticket details and messages; authors never receive internal notes, AI drafts/rationale, or assignment |
| PATCH  | `/tickets/:id`          | Admin          | `{version,status?,category?,priority?,assigned_to?}` → updated ticket; at least one change required   |
| POST   | `/tickets/:id/messages` | Owner or admin | `{body,internal?:false}` → 201; only admins may set `internal:true`                                   |
| POST   | `/tickets/:id/draft`    | Admin          | No body; queues generation/regeneration; 202; 10 per minute per IP                                    |

`GET /health` is outside `/api`: 200 `{status:"ok"}` when MongoDB is connected, otherwise 503.

### Ticket filters and ordering

`GET /tickets?status=Open&priority=High&category=Royalty%20%26%20Payments&from=2026-01-01&to=2026-12-31&page=1`

Filters are optional and combined with AND. Dates are valid `YYYY-MM-DD`, UTC calendar dates, inclusive. Page is a positive integer; page size is 20. Unresolved tickets precede resolved/closed tickets; priority sorts Critical → High → Medium → Low, then creation time ascending. IDs are MongoDB ObjectIds. Search in the React queue applies to the current page only and is labeled accordingly.

### Enums

- Status: `Open`, `In Progress`, `Resolved`, `Closed`.
- Priority: `Critical`, `High`, `Medium`, `Low`.
- Category: `Royalty & Payments`, `ISBN & Metadata Issues`, `Printing & Quality`, `Distribution & Availability`, `Book Status & Production Updates`, `General Inquiry`.

`assigned_to` accepts the current administrator's ID (returned by `/auth/me`) or `null`. Admin updates require the ticket's current integer `version`; stale versions return 409. AI processing increments version, so fetch again after a conflict. Authors' public replies reopen resolved tickets. Closed tickets accept admin notes/replies but reject author replies.

### Validation and errors

Subject: 3–160 trimmed characters. Description: 10–8,000. Message: 1–10,000. Email: 3–254. Password: 1–200. JSON body limit: 32 KB. Book IDs must belong to the author. `internal` must be boolean. Unsupported enum values and invalid dates/pages are rejected.

- 400: malformed JSON.
- 401: missing/expired login or invalid credentials.
- 403: CSRF or role violation.
- 404: inaccessible/missing ticket or endpoint.
- 409: stale ticket version.
- 413: request body too large.
- 422: invalid input or prohibited lifecycle action.
- 429: login/draft rate limit.
- 500: unexpected failure, with a generic client message and server-side error logging.

### Polling

The React UI requests the queue, dashboard counts and open conversation every four seconds while the tab is visible. It replaces server state without reloading the page or clearing reply text. Draft insertion is explicit, so polling never replaces a response being edited.

### Example with curl

```sh
curl -c cookies.txt http://localhost:3000/api/auth/csrf
# Copy data.csrfToken from the response into TOKEN.
curl -b cookies.txt -c cookies.txt -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"email":"priya.sharma@email.com","password":"AuthorDemo!2026"}' \
  http://localhost:3000/api/auth/login
# Replace TOKEN with the NEW token returned by login.
curl -b cookies.txt -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"book_id":"BK001","subject":"Royalty question","description":"Can you check my pending royalty balance?"}' \
  http://localhost:3000/api/tickets
```

Keep cookie files out of source control.
