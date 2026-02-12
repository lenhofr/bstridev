# scoring-rules Specification

## Purpose
Define the scoring and tie-break rules for the Bar Sports Triathlon games so the admin workflow can compute placings, points, and totals consistently.
## Requirements

### Requirement: Finalization gates places/points
The system SHALL only award places/points for a game when that game is marked finalized.

#### Scenario: Not finalized
- **GIVEN** a game is not finalized
- **THEN** the system SHALL NOT award places/points for that game

#### Scenario: Finalized
- **WHEN** an admin finalizes a game
- **THEN** the system SHALL compute and award places/points for that game

### Requirement: Bowling format
The system SHALL define bowling scoring for the triathlon as three separate regulation games.

#### Scenario: Three games scored independently
- **WHEN** bowling scores are recorded for an event
- **THEN** the system SHALL store results for three separate bowling games
- **AND** each game’s placing SHALL be determined independently

### Requirement: Bowling rules
Bowling games SHALL be scored using standard PBA rules.

#### Scenario: Standard scoring
- **WHEN** a bowling game is scored
- **THEN** the end score SHALL be determined by standard bowling rules

### Requirement: Bowling lane assignment and schedule coupling
The system SHALL record that lane/order selection for bowling also determines the 8-ball / 9-ball pool schedule order.

#### Scenario: Order selection recorded
- **WHEN** lane/order selection is performed
- **THEN** the resulting order SHALL be recorded as event metadata

### Requirement: Bowling ranking
Bowling game winning order SHALL be determined by each player’s end score.

#### Scenario: Rank by score
- **WHEN** a bowling game completes
- **THEN** players SHALL be ranked by end score descending

### Requirement: Bowling points
Each bowling game SHALL award points by placing.

#### Scenario: Award standard points
- **WHEN** bowling placings are finalized for a game
- **THEN** 1st place SHALL receive 3 points
- **AND** 2nd place SHALL receive 2 points
- **AND** 3rd place SHALL receive 1 point

#### Scenario: Optional 4th/5th points
- **WHEN** an event enables optional lower-place points
- **THEN** 4th place SHALL receive 0.5 points
- **AND** 5th place SHALL receive 0.25 points

### Requirement: Bowling tie-breaker
The system SHALL resolve ties for any placing via a roll-off procedure.

#### Scenario: Tie resolved by one-ball roll-off
- **WHEN** a placing results in a tie
- **THEN** tied players SHALL perform a one-ball roll-off
- **AND** the player with the most pins in the roll-off SHALL be ranked higher

#### Scenario: Tie with strikes
- **WHEN** a roll-off results in a tie by strike
- **THEN** the roll-off SHALL be repeated

#### Scenario: Tie without strikes
- **WHEN** a roll-off results in a tie by less than a strike
- **THEN** tied players SHALL throw a second ball at remaining pins
- **AND** roll-off attempts SHALL repeat until a victor is determined

### Requirement: Darts games
The darts sub-event SHALL consist of three games: cricket, 401 double-out, and 301 double-in double-out.

#### Scenario: Darts game list
- **WHEN** darts scores are recorded for an event
- **THEN** the system SHALL store results for cricket, 401 double-out, and 301 double-in double-out

### Requirement: Darts points
Each darts game SHALL award points by placing, using the same point schedule as other triathlon games.

#### Scenario: Award standard points
- **WHEN** darts placings are finalized for a game
- **THEN** 1st place SHALL receive 3 points
- **AND** 2nd place SHALL receive 2 points
- **AND** 3rd place SHALL receive 1 point

#### Scenario: Optional 4th/5th points
- **WHEN** an event enables optional lower-place points
- **THEN** 4th place SHALL receive 0.5 points
- **AND** 5th place SHALL receive 0.25 points

### Requirement: Pool games
The pool sub-event SHALL consist of three games: 8-ball, 9-ball, and run.

#### Scenario: Pool game list
- **WHEN** pool scores are recorded for an event
- **THEN** the system SHALL store results for 8-ball, 9-ball, and run

### Requirement: Pool points
Each pool game SHALL award points by placing, using the same point schedule as other triathlon games.

#### Scenario: Award standard points
- **WHEN** pool placings are finalized for a game
- **THEN** 1st place SHALL receive 3 points
- **AND** 2nd place SHALL receive 2 points
- **AND** 3rd place SHALL receive 1 point

#### Scenario: Optional 4th/5th points
- **WHEN** an event enables optional lower-place points
- **THEN** 4th place SHALL receive 0.5 points
- **AND** 5th place SHALL receive 0.25 points

### Requirement: 8-ball format
8-ball SHALL be played as a round-robin where each participant plays every other participant once.

#### Scenario: Round-robin schedule
- **WHEN** an event runs the 8-ball game
- **THEN** each participant SHALL play every other participant once

#### Scenario: Bye handling
- **WHEN** the number of participants is odd and a participant has a bye in a round
- **THEN** the bye SHALL count as a win for that participant for the 8-ball game

#### Scenario: Determine game placings
- **WHEN** all 8-ball matches are complete
- **THEN** overall placings for the 8-ball game SHALL be determined by total match wins

#### Scenario: Schedule exists but matches are incomplete
- **GIVEN** an 8-ball schedule exists
- **WHEN** one or more scheduled matches do not yet have a recorded winner
- **THEN** overall placings and points for the 8-ball game SHALL remain unset

#### Scenario: Tie-break by head-to-head
- **WHEN** two or more participants are tied in 8-ball match wins
- **THEN** the tie SHALL be broken by head-to-head record among the tied participants
- **AND** if the tie remains unbroken, a playoff MAY be used as determined by the scorekeeper

#### Scenario: Break selection
- **WHEN** an 8-ball match starts
- **THEN** break order SHALL be determined by a coin flip

### Requirement: 8-ball rules
8-ball SHALL use called shots after the break, with break and scratch handling as specified.

#### Scenario: Called shots
- **WHEN** a player shoots after the break
- **THEN** the player SHALL call the intended shot

#### Scenario: Scratch on break
- **WHEN** a player scratches on the break
- **THEN** any balls made on the break SHALL remain pocketed

#### Scenario: 8-ball on break
- **WHEN** a player pockets the 8-ball on the break
- **THEN** the player SHALL win

#### Scenario: 8-ball on break with scratch
- **WHEN** a player pockets the 8-ball on the break and scratches
- **THEN** the player SHALL lose

#### Scenario: Assigning solids/stripes
- **WHEN** a break pockets only solids and no scratch occurs
- **THEN** the breaker SHALL be solids
- **WHEN** a break pockets only stripes and no scratch occurs
- **THEN** the breaker SHALL be stripes
- **WHEN** a break pockets a mix of solids and stripes
- **THEN** the table SHALL be open

#### Scenario: 8-ball contact restrictions
- **WHEN** a player is on the 8-ball
- **THEN** the player SHALL NOT contact any other ball

#### Scenario: Scratch penalty
- **WHEN** a player scratches during 8-ball
- **THEN** the player SHALL pull one ball
- **AND** SHALL also pull any of the player’s balls pocketed on that shot

### Requirement: 9-ball format
9-ball SHALL be played as a round-robin where each participant plays every other participant once.

#### Scenario: Round-robin schedule
- **WHEN** an event runs the 9-ball game
- **THEN** each participant SHALL play every other participant once

#### Scenario: Bye handling
- **WHEN** the number of participants is odd and a participant has a bye in a round
- **THEN** the bye SHALL count as a win for that participant for the 9-ball game

#### Scenario: Determine game placings
- **WHEN** all 9-ball matches are complete
- **THEN** overall placings for the 9-ball game SHALL be determined by total match wins

#### Scenario: Schedule exists but matches are incomplete
- **GIVEN** a 9-ball schedule exists
- **WHEN** one or more scheduled matches do not yet have a recorded winner
- **THEN** overall placings and points for the 9-ball game SHALL remain unset

#### Scenario: Tie-break by head-to-head
- **WHEN** two or more participants are tied in 9-ball match wins
- **THEN** the tie SHALL be broken by head-to-head record among the tied participants
- **AND** if the tie remains unbroken, a playoff MAY be used as determined by the scorekeeper

#### Scenario: Break selection
- **WHEN** a 9-ball match starts
- **THEN** break order SHALL be determined by a coin flip

### Requirement: Pool match result entry
Pool match results SHALL be recorded per matchup by capturing the winner of 8-ball and the winner of 9-ball.

#### Scenario: Record both winners for a matchup
- **WHEN** a pool matchup between two participants completes
- **THEN** the scorekeeper SHALL record the 8-ball winner and the 9-ball winner for that matchup

### Requirement: 9-ball rules
9-ball SHALL use lowest-ball-first contact rules and slop counts.

#### Scenario: Lowest ball first
- **WHEN** a player takes a shot
- **THEN** the first ball struck SHALL be the lowest-number ball on the table

#### Scenario: Slop counts
- **WHEN** a ball is pocketed in 9-ball
- **THEN** the shot SHALL NOT require a called pocket

#### Scenario: 9-ball on break
- **WHEN** a player pockets the 9-ball on the break
- **THEN** the player SHALL win

#### Scenario: 9-ball on break with scratch
- **WHEN** a player pockets the 9-ball on the break and scratches
- **THEN** the 9-ball SHALL be spotted

#### Scenario: Scratch on break (no ball-in-hand)
- **WHEN** a player scratches on the break
- **THEN** the opponent SHALL shoot from behind the scratch line

#### Scenario: Foul penalties
- **WHEN** a player scratches, fails to hit the low-number ball first, or shoots the cue ball off the table
- **THEN** the opponent SHALL receive ball-in-hand

### Requirement: Run format
Run SHALL be recorded as the greater of two attempts, counting balls made until a scratch occurs or no ball is pocketed.

#### Scenario: Rank by run total
- **WHEN** run totals are computed for all participants
- **THEN** participants SHALL be ranked by run total (balls made) descending

#### Scenario: Neutral observer
- **WHEN** a participant performs a run attempt
- **THEN** a neutral observer SHOULD watch the attempt

#### Scenario: Run attempt rules
- **WHEN** a run attempt begins
- **THEN** the participant SHALL rack their own balls
- **AND** scratching on the break SHALL NOT end the attempt
- **AND** shots SHALL NOT be called
- **AND** the attempt SHALL continue until a scratch occurs or no ball is pocketed
- **AND** if all 15 balls are made the balls SHALL be re-racked and play continues under the same rules

#### Scenario: Scratch at end of run
- **WHEN** a run attempt ends in a scratch
- **THEN** balls made on that scratch shot SHALL NOT count toward the run total

#### Scenario: Two attempts and best score
- **WHEN** two run attempts are completed
- **THEN** the run total SHALL be the greater of the two totals

#### Scenario: Tie-break by repeat run
- **WHEN** one or more placings are tied by identical run totals
- **THEN** only the tied participants SHALL repeat run attempts
- **AND** repeat attempts SHALL continue until the tie is resolved

### Requirement: Cricket rules
Cricket SHALL be played by closing out 20, 19, 18, 17, 16, 15, and bull’s-eye.

#### Scenario: Closing numbers
- **WHEN** a player records cricket marks
- **THEN** a number SHALL be considered closed when the player has 3 legal marks for that number
- **AND** legal marks SHALL include single, double, or triple
- **AND** numbers MAY be closed in any order

#### Scenario: Rounds
- **WHEN** cricket is played
- **THEN** each round SHALL complete after every player has thrown 3 darts

#### Scenario: Cricket win condition
- **WHEN** a player closes all required numbers at the end of any round
- **THEN** that player SHALL earn the highest remaining placing for that game

### Requirement: Cricket tie-breaker
If more than one player closes all required numbers in the same round, the placing SHALL be resolved by a bull’s-eye shootout.

#### Scenario: Bull’s-eye shootout
- **WHEN** multiple players close all numbers in the same round
- **THEN** those players SHALL each throw 3 darts at the bull’s-eye
- **AND** the player with the most bull’s-eyes SHALL be ranked higher

#### Scenario: Repeat shootout
- **WHEN** a bull’s-eye shootout results in a tie
- **THEN** the shootout SHALL repeat until a winner is determined

#### Scenario: Fill remaining places
- **WHEN** first place is determined
- **THEN** additional rounds SHALL continue until all remaining places are filled (2nd, 3rd, etc.)

### Requirement: 401 double-out rules
401 double-out SHALL start each player at 401 and deduct each turn’s scored total, with an exact-zero finish on a double.

#### Scenario: Turn scoring
- **WHEN** a player throws a set of 3 darts
- **THEN** the turn total SHALL be the sum of the dart scores including doubles and triples
- **AND** the player’s remaining total SHALL be reduced by the turn total

#### Scenario: Double-out finish
- **WHEN** a player reaches exactly zero
- **THEN** the last dart used to reach zero SHALL have landed in a double area

#### Scenario: Bust
- **WHEN** a player’s remaining total becomes 1 or less than zero after any dart in a turn
- **THEN** the turn SHALL end
- **AND** no points SHALL be deducted for that round

#### Scenario: 401 win condition
- **WHEN** a player reaches zero at the end of any round
- **THEN** that player SHALL earn the highest remaining placing for that game

### Requirement: 401 tie-breaker
If more than one player reaches zero in the same round, the placing SHALL be resolved by a bull’s-eye shootout.

#### Scenario: Bull’s-eye shootout
- **WHEN** multiple players reach zero in the same round
- **THEN** those players SHALL each throw 3 darts at the bull’s-eye
- **AND** the player with the most bull’s-eyes SHALL be ranked higher
- **AND** ties SHALL repeat shootouts until resolved

#### Scenario: Fill remaining places
- **WHEN** first place is determined
- **THEN** additional rounds SHALL continue until all remaining places are filled (2nd, 3rd, etc.)

### Requirement: 301 double-in double-out rules
301 double-in double-out SHALL start each player at 301, require a double to start scoring, and require an exact-zero finish on a double.

#### Scenario: Double-in start
- **WHEN** a player has not yet hit a double in the game
- **THEN** deductions SHALL NOT start until the player hits a double area

#### Scenario: Double-in within a turn
- **WHEN** the first double is hit on the 2nd dart of a 3-dart turn
- **THEN** the 1st dart of that turn SHALL NOT count toward that turn’s total

#### Scenario: Double-in within a turn (third dart)
- **WHEN** the first double is hit on the 3rd dart of a 3-dart turn
- **THEN** the 1st and 2nd darts of that turn SHALL NOT count toward that turn’s total

#### Scenario: Turn scoring
- **WHEN** a player is “in” (double has been hit previously)
- **THEN** the turn total SHALL be the sum of dart scores including doubles and triples
- **AND** the player’s remaining total SHALL be reduced by the turn total

#### Scenario: Double-out finish
- **WHEN** a player reaches exactly zero
- **THEN** the last dart used to reach zero SHALL have landed in a double area

#### Scenario: Bust
- **WHEN** a player’s remaining total becomes 1 or less than zero after any dart in a turn
- **THEN** the turn SHALL end
- **AND** no points SHALL be deducted for that round

#### Scenario: 301 win condition
- **WHEN** a player reaches zero at the end of any round
- **THEN** that player SHALL earn the highest remaining placing for that game

### Requirement: 301 tie-breaker
If more than one player reaches zero in the same round, the placing SHALL be resolved by a bull’s-eye shootout.

#### Scenario: Bull’s-eye shootout
- **WHEN** multiple players reach zero in the same round
- **THEN** those players SHALL each throw 3 darts at the bull’s-eye
- **AND** the player with the most bull’s-eyes SHALL be ranked higher
- **AND** ties SHALL repeat shootouts until resolved

#### Scenario: Fill remaining places
- **WHEN** first place is determined
- **THEN** additional rounds SHALL continue until all remaining places are filled (2nd, 3rd, etc.)

### Requirement: Triathlon overall winner
The triathlon overall winner for a given year SHALL be the participant with the highest total points accumulated across all sub-events and games.

#### Scenario: Determine overall winner
- **WHEN** all game points have been finalized for an event
- **THEN** each participant’s triathlon total SHALL be the sum of points across all games
- **AND** the participant with the highest triathlon total SHALL be ranked 1st overall

### Requirement: Recording tie-break outcomes
The scoring data SHALL be able to record tie-break outcomes.

#### Scenario: Store tie-break details
- **WHEN** a tie-break is used to resolve a placing
- **THEN** the stored scoring data SHALL indicate that a tie-break occurred
- **AND** SHALL record enough detail to explain the resolution (at minimum: participants involved and winner)

