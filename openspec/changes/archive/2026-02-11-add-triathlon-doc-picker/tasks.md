## 1. Specification
- [x] Add `triathlon-doc-management` delta: discovery + year-filtered selection

## 2. Implementation
- [x] Web (admin setup): add a Year filter + dropdown list of available TRIs
- [x] localStorage listing: derive available docs by scanning keys and reading doc metadata (eventId/year/status/updatedAt)
- [x] AWS listing: add authenticated endpoint to list available docs (optionally filtered by year)
- [x] AWS persistence: ensure year + timestamps needed for listing are stored on the DynamoDB item in queryable fields
- [x] Add minimal unit coverage for list/parse helpers (as applicable)

## 3. Validation
- [x] `make web-test`
- [x] `make web-build`
