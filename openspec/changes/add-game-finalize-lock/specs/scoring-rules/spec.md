## MODIFIED Requirements

### Requirement: Bowling points
Each bowling game SHALL award points by placing.

#### Scenario: Award points only when finalized
- **GIVEN** a bowling game is not finalized
- **THEN** the system SHALL NOT award places/points for that game
- **WHEN** the bowling game is finalized
- **THEN** places/points SHALL be computed and awarded

### Requirement: Darts points
Each darts game SHALL award points by placing, using the same point schedule as other triathlon games.

#### Scenario: Award points only when finalized
- **GIVEN** a darts game is not finalized
- **THEN** the system SHALL NOT award places/points for that game
- **WHEN** the darts game is finalized
- **THEN** places/points SHALL be computed and awarded

### Requirement: Pool points
Each pool game SHALL award points by placing, using the same point schedule as other triathlon games.

#### Scenario: Award points only when finalized
- **GIVEN** a pool game is not finalized
- **THEN** the system SHALL NOT award places/points for that game
- **WHEN** the pool game is finalized
- **THEN** places/points SHALL be computed and awarded
