## 1. Specification
- [ ] Update `scoring-data-model` delta: store per-game finalize/lock state
- [ ] Update `scoring-rules` delta: award places/points only when finalized

## 2. Implementation
- [ ] Add finalize state to scoring model types + default document creation
- [ ] Admin UI: add per-game “Mark complete” toggle
- [ ] Scoring derivation: if game not finalized, keep `place=null` and `points=null` (raw may still be computed)
- [ ] Add/adjust unit tests covering finalized vs not-finalized behavior

## 3. Validation
- [ ] `make web-test`
- [ ] `make web-build`
