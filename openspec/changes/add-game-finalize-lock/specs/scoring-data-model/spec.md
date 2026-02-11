## ADDED Requirements

### Requirement: Store per-game finalization state
The scoring document SHALL be able to store whether each game’s results are finalized (locked) for scoring.

#### Scenario: Game is not finalized
- **GIVEN** a game is not finalized
- **WHEN** partial raw scores are entered
- **THEN** the document SHALL still store the raw inputs
- **AND** the game’s places/points SHALL be considered not final

#### Scenario: Finalize a game
- **WHEN** an admin marks a game as finalized
- **THEN** the document SHALL record that finalized state per game id
