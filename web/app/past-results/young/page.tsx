import { PanelIcons } from '../../_components/PanelIcons';

type Row = { team: string; bowl: number; pool: number; darts: number; total: number };

type YearBlock = {
  year: string;
  title: string;
  rows: Row[];
  commentary: string[];
};

const years: YearBlock[] = [
  {
    year: '2023',
    title: 'Young Guys Results',
    rows: [
      { team: 'Team D', bowl: 8, pool: 8, darts: 7, total: 23 },
      { team: 'Team E', bowl: 6, pool: 9, darts: 7, total: 22 },
      { team: 'Team F', bowl: 7, pool: 6, darts: 8, total: 21 }
    ],
    commentary: ['A textbook “win pool, survive darts” strategy.', 'Lane luck was real.']
  }
];

export default function PastResultsYoung() {
  return (
    <>
      <PanelIcons />
      <h1 className="panelTitle">Past Results — Young Guys</h1>
      <p className="kicker">Static-first view with the classic layout (tables + commentary).</p>

      {years.map((y) => (
        <section key={y.year} style={{ marginTop: 18 }}>
          <h2 style={{ margin: 0 }}>{y.year}</h2>
          <p className="subtle" style={{ margin: '6px 0 12px' }}>
            {y.title}
          </p>

          <div className="grid2">
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Bowling</th>
                    <th>Pool</th>
                    <th>Darts</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {y.rows.map((r) => (
                    <tr key={r.team}>
                      <td>{r.team}</td>
                      <td>{r.bowl}</td>
                      <td>{r.pool}</td>
                      <td>{r.darts}</td>
                      <td>{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Commentary</h3>
              <ul className="bullets">
                {y.commentary.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rule" style={{ marginTop: 18 }} />
        </section>
      ))}
    </>
  );
}
