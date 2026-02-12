## 1. Specification
- [x] Update `scoring-data-model` delta: store per-game finalize/lock state
- [x] Update `scoring-rules` delta: award places/points only when finalized

## 2. Implementation
- [x] Add finalize state to scoring model types + default document creation
- [x] Admin UI: add per-game “Mark complete” toggle
- [x] Scoring derivation: if game not finalized, keep `place=null` and `points=null` (raw may still be computed)
- [x] Add/adjust unit tests covering finalized vs not-finalized behavior

## 3. Validation
- [x] `make web-test`
- [x] `make web-build`
