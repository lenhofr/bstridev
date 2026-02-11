## Context
- The site is a **Next.js static export** deployed to S3/CloudFront.
- “Admin page” must therefore be a client-side app that talks to an external backend over HTTPS.
- The requested unit of work is “this year’s triathlon event”, which consists of 3 sub-events: **bowling**, **pool**, and **darts**.

## Goals / Non-Goals
### Goals
- Provide an authenticated admin UI for creating/updating scoring data for an event.
- Store scoring data durably in AWS.
- Support viewing the latest **published** results publicly.

### Non-Goals
- Full CMS for arbitrary site content.
- Complex role-based access control beyond “admin vs not admin” in v1.

## Proposed Architecture
### Auth
- Use **Amazon Cognito User Pool** for admin users.
- Use Hosted UI (OAuth2 / OIDC) for login.
- The web client stores the resulting JWTs and sends them as `Authorization: Bearer <token>` to the API.

### API
- API Gateway + Lambda (REST) with JWT authorizer validating Cognito tokens.
- Endpoints (high-level):
  - `GET /events` / `GET /events/{eventId}`
  - `PUT /events/{eventId}` (metadata)
  - `GET /events/{eventId}/scores` (published view)
  - `POST /events/{eventId}/scores:draft` / `PUT` (admin write)
  - `POST /events/{eventId}/publish` (promote draft → published)

### Data Model (DynamoDB)
Minimal starting point:
- `Events` table: `eventId` (e.g., `triathlon-2026`), year, display name, dates/locations (optional).
- `Scores` table: partition by `eventId`; store per-team/per-player results.

To reflect triathlon structure:
- Event contains 3 sub-events: bowling/pool/darts.
- Each sub-event contains 3 games.

We can store either:
1) **Raw scores** for each game + derive points; or
2) **Points** directly.

Recommendation: store raw scores *and* the derived points (computed in the admin UI), so the UI is the single source for calculations and the public site just renders published data.

## Security Considerations
- The `/admin/*` routes are not truly “private” on a static site; security MUST come from authentication + API authorization.
- Ensure the API does not expose draft scoring to unauthenticated callers.

## Rollout / Migration
- Phase 1: Ship backend + admin UI with a single event (current year) and a minimal results read endpoint.
- Phase 2: Wire the public results pages to consume published results (optionally fall back to hard-coded content if no published data exists).

## Open Questions
- Do we need per-sub-event admins (e.g., bowling scorer vs full admin)?
- Do we need audit history (who changed what/when)?
