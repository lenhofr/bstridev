# Change: Define scoring rules (bowling/pool/darts)

## Why
The scoring data model defines *how* we store results, but we also need clear, written rules for *how results are produced* (including tie-breakers). This ensures the admin UI and any future automation compute points consistently.

## What Changes
- Specify normative scoring rules per sub-event (starting with bowling).
- Specify tie-breaker procedures and how a resolved tie is recorded.
- Specify point-award rules (placing → points) for each game.

## Impact
- Affected specs:
  - `scoring-rules` (new)
- Follow-up changes (out of scope here):
  - Admin UI and backend logic that implements these rules.
