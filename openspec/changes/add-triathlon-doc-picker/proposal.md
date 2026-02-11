# Change: Add triathlon doc picker

## Why
Right now admins must remember the exact Triathlon Name (eventId) to load/save/publish a scoring document. This is error-prone and unfriendly, especially as more years/events accumulate.

## What Changes
- Admin scoring Setup UI adds a picker that lists available triathlon scoring documents.
- Picker supports filtering by Year.
- Works for both storage modes:
  - localStorage: enumerate locally stored draft/published docs.
  - AWS backend: add an authenticated API to list available docs (filtered by year).
- Manual entry of Triathlon Name remains available (escape hatch).

## Impact
- Affected specs: `triathlon-doc-management`
- Affected code: `web/app/admin/scoring/*`, `web/lib/scoring-api.ts`, `infra/lambda/scoring/*`, `infra/terraform/app/scoring-backend.tf`
