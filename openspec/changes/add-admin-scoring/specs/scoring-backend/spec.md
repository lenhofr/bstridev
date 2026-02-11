## ADDED Requirements

### Requirement: Authenticated write API
The system SHALL provide an API for writing scoring data that requires authenticated admin access.

#### Scenario: Updater identity recorded
- **WHEN** a caller writes scoring data with a valid admin token
- **THEN** the persisted document SHALL record the admin identity (e.g., `updatedBy.userId` and optionally `updatedBy.displayName`)

#### Scenario: Write rejected without token
- **WHEN** a caller attempts to write scoring data without a valid admin token
- **THEN** the API SHALL reject the request

#### Scenario: Write accepted with valid token
- **WHEN** a caller writes scoring data with a valid admin token
- **THEN** the API SHALL persist the scoring data

### Requirement: Public read API
The system SHALL provide a public read path for published scoring.

#### Scenario: Read published scoring
- **WHEN** an unauthenticated caller requests published scoring for an event
- **THEN** the API SHALL return the published scoring data

#### Scenario: Draft scoring not exposed
- **WHEN** an unauthenticated caller requests scoring data
- **THEN** the API SHALL NOT return draft scoring data

### Requirement: Event identification
The system SHALL identify events with a stable identifier suitable for URLs and API paths.

#### Scenario: Triathlon year id
- **WHEN** the triathlon event is created for a given year
- **THEN** the event SHALL have an identifier like `triathlon-YYYY`
