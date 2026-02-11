## 1. Specification
- [ ] Add `triathlon-doc-management` delta: discovery + year-filtered selection

## 2. Implementation
- [ ] Web (admin setup): add a Year filter + dropdown list of available TRIs
- [ ] localStorage listing: derive available docs by scanning keys and reading doc metadata (eventId/year/status/updatedAt)
- [ ] AWS listing: add authenticated endpoint to list available docs (optionally filtered by year)
- [ ] AWS persistence: ensure year + timestamps needed for listing are stored on the DynamoDB item in queryable fields
- [ ] Add minimal unit coverage for list/parse helpers (as applicable)

## 3. Validation
- [ ] `make web-test`
- [ ] `make web-build`
