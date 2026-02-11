# Change: Define scoring data model for triathlon events

## Why
We want an admin workflow and future results pages, but we first need a canonical, stable scoring data model that is easy to read and render in the web app. Establishing the data structure up-front reduces churn when we later add admin UI, auth, and backend APIs.

## What Changes
- Define the canonical data model for a yearly triathlon event (bowling + pool + darts; 3 games each).
- Define identifiers, ordering, and a schema/versioning strategy for forward compatibility.
- Define draft vs published semantics for scoring data.

## Impact
- Affected specs:
  - `scoring-data-model` (new)
- Follow-up changes (out of scope here):
  - Admin UI (`/admin/scoring`)
  - Auth + write APIs (Cognito + API Gateway/Lambda)

## Non-Goals (this change)
- Implementing the admin UI.
- Implementing authentication.
- Implementing the full backend runtime (we’re defining the contract/shape first).
