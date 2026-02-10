import { PanelIcons } from '../_components/PanelIcons';
import { RulesTabs } from '../_components/RulesTabs';

export default function Rules() {
  return (
    <>
      <PanelIcons />
      <h1 className="panelTitle">Rules</h1>

      <h2 style={{ margin: '0 0 10px' }}>Overview</h2>
      <div className="rule" />

      <ul className="bullets">
        <li>
          The Bar Sports Triathlon consists of 3 sporting events hand selected to compliment the alcohol consumption
          naturally associated with each.
        </li>
        <li>The 3 sports are Bowling, Pool, and Darts.</li>
        <li>Each sport consists of 3 games per event.</li>
        <li>Each game is scored separately and the points are totaled from all games to determine an overall winner.</li>
        <li>Each game is scored evenly with 1st Place receiving 3 points, 2nd Place receiving 2 points, and 3rd Place receiving 1 point.</li>
        <li>The organizer has the option to add points for 4th Place (1/2 point) and 5th Place (1/4 point).</li>
        <li>Entry fee also varies per year based on number of participants and individual game payouts.</li>
      </ul>

      <div className="rule" style={{ marginTop: 18 }} />

      <RulesTabs />
    </>
  );
}
