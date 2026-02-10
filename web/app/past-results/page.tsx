import { PanelIcons } from '../_components/PanelIcons';

type Row = { team: string; bowl: number; pool: number; darts: number; total: number };

type YearBlock = {
  year: string;
  title: string;
  rows: Row[];
  commentary: string[];
};

const years: YearBlock[] = [
  {
    year: '2024',
    title: 'Old Guys Results',
    rows: [
      { team: 'Team A', bowl: 9, pool: 7, darts: 8, total: 24 },
      { team: 'Team B', bowl: 7, pool: 9, darts: 6, total: 22 },
      { team: 'Team C', bowl: 6, pool: 6, darts: 9, total: 21 }
    ],
    commentary: [
      'Bowling was clean and early — the real damage happened in pool.',
      'Cricket ran long; “one more round” lied to everyone.',
      'Somehow the tab was still worse than the scores.'
    ]
  },
  {
    year: '2023',
    title: 'Young Guys Results',
    rows: [
      { team: 'Team D', bowl: 8, pool: 8, darts: 7, total: 23 },
      { team: 'Team E', bowl: 6, pool: 9, darts: 7, total: 22 },
      { team: 'Team F', bowl: 7, pool: 6, darts: 8, total: 21 }
    ],
    commentary: ['A textbook “win pool, survive darts” strategy.', 'Lane luck was real.'],
  },
  {
    year: '2022',
    title: 'Old Guys Results',
    rows: [
      { team: 'Team G', bowl: 9, pool: 6, darts: 7, total: 22 },
      { team: 'Team H', bowl: 7, pool: 7, darts: 7, total: 21 },
      { team: 'Team I', bowl: 6, pool: 8, darts: 6, total: 20 }
    ],
    commentary: ['The year the 301 double-in turned into a group therapy session.'],
  }
];

export default function PastResults() {
  return (
    <>
      <PanelIcons />
      <h1 className="panelTitle">Past Results</h1>
      <p className="kicker">
        Static-first view with the classic layout (tables + commentary). Phase 2 will load the real history from DynamoDB
        with filters/search.
      </p>

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

      <p className="subtle">
        Want this to match the old site closer? Point me at the source data (or a CSV export) and I’ll wire it into Phase 2.
      </p>
    </>
  );
}
