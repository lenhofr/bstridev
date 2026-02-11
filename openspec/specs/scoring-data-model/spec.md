# scoring-data-model Specification

## Purpose
Define the canonical JSON scoring document for a yearly Bar Sports Triathlon event (bowling/pool/darts) so the admin workflow and public results pages can read/write a stable, render-friendly shape.
## Requirements
### Requirement: Canonical scoring document
The system SHALL define a canonical scoring document for a triathlon event that is easy to render in the web app.

#### Scenario: Reading a published event
- **WHEN** a client loads the published scoring document for an event
- **THEN** the document SHALL contain all sub-events, games, participants, and scores needed to render standings

### Requirement: Event identity
The system SHALL identify a yearly triathlon event using a stable identifier.

#### Scenario: Triathlon year id
- **WHEN** the triathlon event is created for year `YYYY`
- **THEN** the event SHALL have an identifier like `triathlon-YYYY`

### Requirement: Triathlon structure
The system SHALL model a triathlon event as consisting of three sub-events: bowling, pool, and darts.

#### Scenario: Canonical ordering
- **WHEN** a scoring document is produced
- **THEN** the sub-events SHALL appear in a canonical order: bowling, pool, darts

### Requirement: Game structure
The system SHALL model each sub-event as having exactly three games.

#### Scenario: Bowling has three games
- **WHEN** a scoring document is produced
- **THEN** it SHALL include exactly three bowling games
- **AND** exactly three darts games
- **AND** exactly three pool games

### Requirement: Pool schedule and match results
The scoring document SHALL be able to represent a pool round-robin schedule and match results for 8-ball and 9-ball.

#### Scenario: View schedule ahead of time
- **WHEN** a client loads the scoring document
- **THEN** it SHALL be able to display the pool schedule for all rounds including byes
- **AND** each matchup’s assigned pool table number

#### Scenario: Record both winners for a matchup
- **WHEN** a pool matchup between two participants completes
- **THEN** the scoring document SHALL be able to record the matchup
- **AND** the 8-ball winner
- **AND** the 9-ball winner

#### Scenario: Bye recorded
- **WHEN** a round has a bye due to an odd number of participants
- **THEN** the schedule and/or results representation SHALL be able to record the bye

#### Scenario: Stable game ids
- **WHEN** a scoring document is produced
- **THEN** each game SHALL have a stable identifier
- **AND** the identifiers SHOULD be predictable (e.g., `bowling-1`, `bowling-2`, `bowling-3`)

### Requirement: Individual scoring
The system SHALL store scoring per individual participant.

#### Scenario: Participant identity
- **WHEN** a participant appears in a scoring document
- **THEN** the participant SHALL have a stable `personId`
- **AND** a display name suitable for the public site

### Requirement: Store placing, raw, and points
The system SHALL store placing, raw score, and points for each participant in each game.

#### Scenario: Store an individual game result
- **WHEN** an admin records a participant’s result for a game
- **THEN** the document SHALL be able to store that participant’s `place`, `raw`, and `points` for that game

### Requirement: Store multi-attempt raw scoring
The system SHALL support storing multiple attempts for games that allow repeated attempts (e.g., Pool “Run”).

#### Scenario: Store two run attempts
- **WHEN** a participant completes their two pool run attempts
- **THEN** the scoring document SHALL be able to store both attempt totals
- **AND** store the official run total used for ranking

#### Scenario: Display placing
- **WHEN** the public site renders a game’s results
- **THEN** it SHALL be able to display a participant’s placing from the published document

#### Scenario: Display raw and points
- **WHEN** the public site renders a game’s results
- **THEN** it SHALL be able to display raw score and points from the published document without additional computation

### Requirement: Tie-break metadata
The system SHALL support recording tie-break outcomes for games.

#### Scenario: Bowling roll-off
- **WHEN** a game placing is determined via a tie-break procedure
- **THEN** the published scoring document SHALL record that a tie-break occurred
- **AND** SHALL record at least the tie-break type, tied participants, and the resolved winner

### Requirement: Derived totals included
The system SHALL include derived point totals in the scoring document.

#### Scenario: Render standings
- **WHEN** the public site renders standings
- **THEN** it SHALL be able to use per-sub-event totals and overall totals from the published document

#### Scenario: Overall ranking
- **WHEN** the public site renders overall triathlon standings
- **THEN** it SHALL be able to use the stored overall triathlon totals (points) to rank participants

### Requirement: Audit metadata
The system SHALL support recording the identity of the admin who last updated and published a scoring document.

#### Scenario: Record last updated by
- **WHEN** an admin saves a draft scoring document
- **THEN** the document SHALL include the admin’s stable user identifier as `updatedBy.userId`
- **AND** MAY include a human-friendly name as `updatedBy.displayName`

#### Scenario: Record published by
- **WHEN** an admin publishes a scoring document
- **THEN** the published document SHALL include the admin’s stable user identifier as `publishedBy.userId`
- **AND** MAY include a human-friendly name as `publishedBy.displayName`

### Requirement: Draft vs published states
The system SHALL support draft and published scoring documents per event.

#### Scenario: Draft not public
- **WHEN** a scoring document is in draft state
- **THEN** it SHALL NOT be returned by the public read path

#### Scenario: Published public
- **WHEN** a scoring document is in published state
- **THEN** it SHALL be readable by the public site

