# Change: Add per-game finalize/lock

## Why
Right now, simply entering partial/early scores can cause the UI to compute places/points (and totals) before a game is actually finished. We want an explicit “lock it in” step so score entry and point awarding are distinct.

## What Changes
- Add a per-game finalized/locked flag to the scoring document.
- Update scoring derivation so **places/points are only awarded for finalized games**.
- Admin UI adds a per-game control to mark a game complete (and optionally un-complete).

## Impact
- Affected specs: `scoring-data-model`, `scoring-rules`
- Affected code: scoring model + scoring rules + admin scoring UI
