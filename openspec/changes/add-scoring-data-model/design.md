## Context
- The site is a Next.js static export; any dynamic scoring data must come from externally hosted data (API or static JSON served from CDN).
- The first step is to define a canonical scoring document that is:
  - stable across years
  - human-readable
  - easy to render in the web app
  - forward-compatible

## Canonical scoring document (v1)
A single JSON document per event per state (`draft`, `published`).

### Top-level fields
- `schemaVersion`: integer
- `eventId`: string (e.g., `triathlon-2026`)
- `year`: number (e.g., 2026)
- `status`: `draft|published`
- `updatedAt`: ISO timestamp
- `publishedAt`: ISO timestamp | null
- `eventMeta`: object | null (event-level metadata used for schedule generation/display)
- `participants`: list of individuals
- `subEvents`: fixed list in canonical order: `bowling`, `pool`, `darts`
- `totals`: derived rollups for display

### Participants (individuals)
- `personId`: stable string (slug or UUID)
- `displayName`: string

### Sub-events and games
Each sub-event has exactly 3 games in canonical order.

#### Pool round-robin schedule and match recording
Pool (8-ball and 9-ball) is round-robin, so the scoring document needs to capture:
- the competitor order used for schedule generation (this is also tied to lane set order)
- the per-round matchups (including byes)
- the per-match winner for 8-ball and 9-ball

Recommended shape (v1):
- `eventMeta.competitorOrder`: `personId[]` (1..N)
- `eventMeta.poolTables`: `number[]` (the actual table numbers available at the venue, in the order we will assign them)
- `eventMeta.poolSchedule.rounds[]` where each round has:
  - `round`: number
  - `bye`: `personId | null`
  - `matches`: `{ a: personId, b: personId, table: number }[]`
    - `table` MUST be one of `eventMeta.poolTables`
    - Table assignment is sequential per round (match 1 → poolTables[0], match 2 → poolTables[1], etc.)
- Store match outcomes once per matchup (preferred):
  - `poolMatches[]`: `{ round: number, a: personId, b: personId, table: number, winner8Ball: personId, winner9Ball: personId }`

Derived fields:
- `results[personId].raw` for 8-ball can be computed match-wins count (including byes as wins).
- `results[personId].raw` for 9-ball can be computed match-wins count (including byes as wins).

Stable game ids (recommended):
- Bowling: `bowling-1`, `bowling-2`, `bowling-3`
- Pool: `pool-1`, `pool-2`, `pool-3`
- Darts: `darts-1`, `darts-2`, `darts-3`

### Results per game
For each game, store per-person results:
- `place`: number | null (1 = first, 2 = second, etc.)
- `raw`: number | null
- `points`: number | null
- `attempts`: number[] | null (optional; used when a game has multiple attempts, e.g., Pool “Run”)
- `tieBreak`: object | null (only when a tie-break was required to finalize placing)

We store placing, raw score, and points so the document is self-contained and displayable even if point-calculation rules evolve.

#### Pool “Run” specific notes
- `results[personId].attempts` stores the two run attempts (balls made).
- `results[personId].raw` stores the official run total (max of attempts, excluding scratch-shot balls per rules).
- Any tie-break reruns can be appended to `attempts` (and optionally explained via `tieBreak`).

#### `tieBreak` shape (v1)
A minimal, explainable record of how a tie was resolved.
- `type`: one of:
  - `BOWLING_ROLL_OFF`
  - `DARTS_BULL_SHOOTOUT`
  - `POOL_RUN_REPEAT`
  - `OTHER`
- `participants`: array of `personId` involved in the tie
- `winner`: `personId` (the resolved higher-ranked participant)
- `notes`: string | null (optional freeform)

### Derived totals
To keep rendering simple, include rollups:
- per-person totals per sub-event
- per-person overall triathlon total

The admin UI (future change) is responsible for computing rollups before publishing; the public site should treat published data as authoritative.

## Storage strategy (AWS)
Use DynamoDB to store scoring documents:
- Table: `ScoringDocuments`
- Keys:
  - `PK`: `EVENT#<eventId>`
  - `SK`: `DOC#<status>` where status is `DRAFT` or `PUBLISHED`
- Attributes:
  - `schemaVersion`, `year`, timestamps
  - `document` (the canonical JSON payload)

This supports:
- clean separation of draft vs published
- simple fetch of published results
- atomic publish by copying draft → published

## Example payload (published)
This example shows the fixed 3×3 game structure plus a pool round-robin schedule (with table numbers) and a pool “Run” multi-attempt result.

```json
{
  "schemaVersion": 1,
  "eventId": "triathlon-2026",
  "year": 2026,
  "status": "published",
  "updatedAt": "2026-02-10T00:00:00.000Z",
  "publishedAt": "2026-02-10T00:00:00.000Z",
  "eventMeta": {
    "competitorOrder": ["rob", "alex", "sam", "pat", "taylor"],
    "poolTables": [13, 14],
    "poolSchedule": {
      "rounds": [
        {
          "round": 1,
          "bye": "rob",
          "matches": [
            { "a": "alex", "b": "taylor", "table": 13 },
            { "a": "sam", "b": "pat", "table": 14 }
          ]
        }
      ]
    }
  },
  "participants": [
    { "personId": "rob", "displayName": "Rob" },
    { "personId": "alex", "displayName": "Alex" },
    { "personId": "sam", "displayName": "Sam" },
    { "personId": "pat", "displayName": "Pat" },
    { "personId": "taylor", "displayName": "Taylor" }
  ],
  "poolMatches": [
    {
      "round": 1,
      "a": "alex",
      "b": "taylor",
      "table": 13,
      "winner8Ball": "alex",
      "winner9Ball": "taylor"
    },
    {
      "round": 1,
      "a": "sam",
      "b": "pat",
      "table": 14,
      "winner8Ball": "sam",
      "winner9Ball": "sam"
    }
  ],
  "subEvents": [
    {
      "subEventId": "bowling",
      "label": "Bowling",
      "games": [
        {
          "gameId": "bowling-1",
          "label": "Bowling Game #1",
          "results": {
            "rob": { "place": 1, "raw": 188, "points": 3, "attempts": null, "tieBreak": null },
            "alex": { "place": 2, "raw": 172, "points": 2, "attempts": null, "tieBreak": null }
          }
        },
        { "gameId": "bowling-2", "label": "Bowling Game #2", "results": {} },
        { "gameId": "bowling-3", "label": "Bowling Game #3", "results": {} }
      ]
    },
    {
      "subEventId": "pool",
      "label": "Pool",
      "games": [
        { "gameId": "pool-1", "label": "8 Ball", "results": {} },
        { "gameId": "pool-2", "label": "9 Ball", "results": {} },
        {
          "gameId": "pool-3",
          "label": "Run",
          "results": {
            "rob": { "place": null, "raw": 11, "points": null, "attempts": [9, 11], "tieBreak": null },
            "alex": { "place": null, "raw": 7, "points": null, "attempts": [7, 5], "tieBreak": null }
          }
        }
      ]
    },
    {
      "subEventId": "darts",
      "label": "Darts",
      "games": [
        { "gameId": "darts-1", "label": "Cricket", "results": {} },
        { "gameId": "darts-2", "label": "401 Double Out", "results": {} },
        { "gameId": "darts-3", "label": "301 Double In/Out", "results": {} }
      ]
    }
  ],
  "totals": {
    "byPerson": {
      "rob": { "bySubEvent": { "bowling": 3, "pool": 0, "darts": 0 }, "triathlon": 3 },
      "alex": { "bySubEvent": { "bowling": 2, "pool": 0, "darts": 0 }, "triathlon": 2 },
      "sam": { "bySubEvent": { "bowling": 0, "pool": 0, "darts": 0 }, "triathlon": 0 },
      "pat": { "bySubEvent": { "bowling": 0, "pool": 0, "darts": 0 }, "triathlon": 0 },
      "taylor": { "bySubEvent": { "bowling": 0, "pool": 0, "darts": 0 }, "triathlon": 0 }
    }
  }
}
```

## Notes
- Later changes can expose `GET /events/{eventId}/scores` returning the published document.
- For caching/CDN simplicity, a later change may also export the published document to S3 as a static JSON file.
