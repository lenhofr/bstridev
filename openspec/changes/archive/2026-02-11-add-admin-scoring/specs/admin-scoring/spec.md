## ADDED Requirements

### Requirement: Admin scoring access
The system SHALL provide an authenticated admin experience for managing scoring.

#### Scenario: Unauthenticated user
- **WHEN** a user who is not authenticated attempts to load the admin scoring UI
- **THEN** the UI SHALL prompt the user to log in
- **AND** no draft scoring data SHALL be accessible without authentication

#### Scenario: Authenticated admin
- **WHEN** an authenticated admin loads the admin scoring UI
- **THEN** the UI SHALL allow viewing and editing scoring data for an event

### Requirement: Canonical scoring model
The admin scoring UI SHALL read and write scoring using the canonical scoring document defined by the `scoring-data-model` spec.

#### Scenario: Editing using canonical model
- **WHEN** an admin selects an event
- **THEN** the UI SHALL present entry sections based on the canonical sub-events and games in the scoring document
- **AND** saved drafts SHALL conform to the canonical scoring document shape

### Requirement: Draft vs published scoring
The system SHALL support draft scoring edits that are not visible publicly until published.

#### Scenario: Save draft
- **WHEN** an admin saves scoring changes
- **THEN** the changes SHALL be stored as a draft
- **AND** the public site SHALL continue to display the last published scoring

#### Scenario: Publish scoring
- **WHEN** an admin publishes the event scoring
- **THEN** the draft scoring SHALL become the published scoring
- **AND** the published scoring SHALL be readable by the public site

### Requirement: Pool round management
The admin UI SHALL provide a clean way to manage pool round-robin matchups within the current round as results come in.

#### Scenario: Manage current round
- **WHEN** an admin opens the pool section
- **THEN** the UI SHALL display the current round’s matchups including assigned pool table numbers
- **AND** SHALL allow recording both the 8-ball winner and 9-ball winner for any matchup in the round in any order

### Requirement: Pool schedule visibility
The admin UI SHALL allow viewing the round-robin schedule ahead of time.

#### Scenario: View upcoming opponents
- **WHEN** an admin views the pool schedule
- **THEN** the UI SHALL display upcoming rounds including matchups, assigned table numbers, and byes

### Requirement: Derived totals
The system SHALL compute and display derived totals for an event based on sub-event scoring.

#### Scenario: Preview totals
- **WHEN** an admin enters or updates per-game scoring
- **THEN** the UI SHALL display updated sub-event totals
- **AND** the UI SHALL display an overall triathlon total
