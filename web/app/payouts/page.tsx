import { PanelIcons } from '../_components/PanelIcons';

const scoring = [
  { game: 'Bowling Game #1', first: '$10 + 5¢ / pin / 3 pts', second: '$15 / 2 pts', third: '$5 / 1 pt', fourth: '$0 / ½ pt', fifth: '$0 / ¼ pt', sixth: '$0 / 0 pts' },
  { game: 'Bowling Game #2', first: '$10 + 5¢ / pin / 3 pts', second: '$15 / 2 pts', third: '$5 / 1 pt', fourth: '$0 / ½ pt', fifth: '$0 / ¼ pt', sixth: '$0 / 0 pts' },
  { game: 'Bowling Game #3', first: '$10 + 5¢ / pin / 3 pts', second: '$15 / 2 pts', third: '$5 / 1 pt', fourth: '$0 / ½ pt', fifth: '$0 / ¼ pt', sixth: '$0 / 0 pts' },
  { game: '8 Ball', first: '$15 / 3 pts', second: '$10 / 2 pts', third: '$5 / 1 pt', fourth: '$0 / ½ pt', fifth: '$0 / ¼ pt', sixth: '$0 / 0 pts' },
  { game: '9 Ball', first: '$15 / 3 pts', second: '$10 / 2 pts', third: '$5 / 1 pt', fourth: '$0 / ½ pt', fifth: '$0 / ¼ pt', sixth: '$0 / 0 pts' },
  { game: 'Pool Run', first: '$15 / 3 pts', second: '$10 / 2 pts', third: '$5 / 1 pt', fourth: '$0 / ½ pt', fifth: '$0 / ¼ pt', sixth: '$0 / 0 pts' },
  { game: 'Cricket', first: '$15 / 3 pts', second: '$10 / 2 pts', third: '$5 / 1 pt', fourth: '$0 / ½ pt', fifth: '$0 / ¼ pt', sixth: '$0 / 0 pts' },
  { game: '401 Double-Out', first: '$15 / 3 pts', second: '$10 / 2 pts', third: '$5 / 1 pt', fourth: '$0 / ½ pt', fifth: '$0 / ¼ pt', sixth: '$0 / 0 pts' },
  { game: '301 Double-In & Double-Out', first: '$15 / 3 pts', second: '$10 / 2 pts', third: '$5 / 1 pt', fourth: '$0 / ½ pt', fifth: '$0 / ¼ pt', sixth: '$0 / 0 pts' }
];

export default function Payouts() {
  return (
    <>
      <PanelIcons />
      <h1 className="panelTitle">Payouts / Scoring</h1>

      <h2 style={{ margin: '0 0 10px' }}>Overview</h2>
      <div className="rule" />

      <div className="grid3">
        <section className="card">
          <h3>Quick Math</h3>
          <p>Each game pays out a total of $30 across all participants.</p>
          <ul>
            <li>9 games × $30 = $270</li>
          </ul>
        </section>

        <section className="card">
          <h3>Bowling Extras</h3>
          <p>1st place in each bowling game earns 5 cents a pin from each other participant to “pay up” to the winner.</p>
          <ul>
            <li>Example: winner rolls 200, another rolls 150 → 50 pins × $0.05 = $2.50</li>
          </ul>
        </section>

        <section className="card">
          <h3>Buy In</h3>
          <p>That means the buy in for the Triathlon is $270 / # of participants.</p>
          <p style={{ marginTop: 10 }}>Be prepared to spend at least $100 for the day.</p>
        </section>
      </div>

      <div className="rule" style={{ marginTop: 18 }} />

      <h2 style={{ margin: '0 0 10px' }}>Payout / Scoring Table</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Game</th>
            <th>1st Place</th>
            <th>2nd Place</th>
            <th>3rd Place</th>
            <th>4th Place</th>
            <th>5th Place</th>
            <th>6th or Lower</th>
          </tr>
        </thead>
        <tbody>
          {scoring.map((r) => (
            <tr key={r.game}>
              <td style={{ width: 190 }}>{r.game}</td>
              <td>{r.first}</td>
              <td>{r.second}</td>
              <td>{r.third}</td>
              <td>{r.fourth}</td>
              <td>{r.fifth}</td>
              <td>{r.sixth}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="subtle" style={{ marginTop: 10 }}>
        Note: formats and payouts can vary by year — this page keeps the classic “BST math” as the default.
      </p>
    </>
  );
}
