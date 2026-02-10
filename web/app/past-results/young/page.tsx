import fs from 'node:fs';
import path from 'node:path';

import { PanelIcons } from '../../_components/PanelIcons';

type TrophyRow = { participant: string; years: string[] };

type ScoreRow = {
  participant: string;
  total: string;
  bowl: string;
  pool: string;
  darts: string;
};

type YearBlock = {
  year: string;
  title: string;
  rows: ScoreRow[];
  note?: string;
  commentary: string[];
  quotes: string[];
};

function isYearLine(line: string) {
  return /^\d{4}$/.test(line.trim());
}

function splitCols(line: string) {
  return line
    .split(/\t+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function toParagraphs(lines: string[]) {
  const text = lines.join('\n');
  return text
    .split(/\n{2,}/g)
    .map((p) => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parseYoungPastResults(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd());

  const trophies: TrophyRow[] = [];
  const years: YearBlock[] = [];

  let i = 0;
  while (i < lines.length && lines[i].trim() !== 'Trophies') i++;

  if (i < lines.length && lines[i].trim() === 'Trophies') {
    i++;
    if (lines[i]?.includes('Participant')) i++;

    while (i < lines.length && lines[i].trim() !== '') {
      const cols = splitCols(lines[i]);
      if (cols.length >= 2) {
        trophies.push({ participant: cols[0], years: cols.slice(1).join(' ').split(/\s+/).filter(Boolean) });
      }
      i++;
    }
  }

  while (i < lines.length) {
    while (i < lines.length && !isYearLine(lines[i])) i++;
    if (i >= lines.length) break;

    const year = lines[i].trim();
    i++;
    while (i < lines.length && lines[i].trim() === '') i++;

    const title = lines[i]?.trim() ?? '';
    i++;

    while (i < lines.length && !/\bTOTAL\b/i.test(lines[i])) i++;
    if (i < lines.length) i++;

    const rows: ScoreRow[] = [];
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) break;
      if (line.startsWith('* Denotes')) break;
      if (line === 'Commentary') break;
      if (isYearLine(line)) break;

      const cols = splitCols(lines[i]);
      if (cols.length >= 5) {
        rows.push({ participant: cols[0], total: cols[1], bowl: cols[2], pool: cols[3], darts: cols[4] });
      }
      i++;
    }

    let note: string | undefined;
    if (lines[i]?.trim().startsWith('* Denotes')) {
      note = lines[i].trim();
      i++;
    }

    while (i < lines.length && lines[i].trim() === '') i++;

    if (lines[i]?.trim() === 'Commentary') i++;

    const commentaryLines: string[] = [];
    const quotes: string[] = [];
    let mode: 'commentary' | 'quotes' = 'commentary';

    while (i < lines.length && !isYearLine(lines[i])) {
      const line = lines[i].trim();
      if (line === 'Athlete Quotes:' || line === 'Athlete Quotes') {
        mode = 'quotes';
        i++;
        continue;
      }

      if (mode === 'commentary') commentaryLines.push(line);
      else if (line) quotes.push(line);
      i++;
    }

    years.push({
      year,
      title,
      rows,
      note,
      commentary: toParagraphs(commentaryLines),
      quotes
    });
  }

  return { trophies, years };
}

export default function PastResultsYoung() {
  const contentPath = path.join(process.cwd(), 'content', 'past_results_young.txt');
  const raw = fs.readFileSync(contentPath, 'utf8');
  const { trophies, years } = parseYoungPastResults(raw);

  return (
    <>
      <PanelIcons />
      <h1 className="panelTitle">Past Results — Young Guys</h1>
      <p className="kicker">Classic format: tables + commentary.</p>

      {trophies.length > 0 && (
        <section style={{ marginTop: 14 }}>
          <h2 style={{ margin: '0 0 10px' }}>Trophies</h2>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Years of Win</th>
                </tr>
              </thead>
              <tbody>
                {trophies.map((t) => (
                  <tr key={t.participant}>
                    <th>{t.participant}</th>
                    <td>
                      <div className="resultsTags">
                        {t.years.map((y) => (
                          <span key={`${t.participant}-${y}`} className="tag">
                            {y}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {years.map((y) => (
        <section key={y.year} style={{ marginTop: 18 }}>
          <div className="rule" style={{ marginTop: 18 }} />
          <h2 style={{ margin: 0 }}>{y.year}</h2>

          <div className="resultsGrid" style={{ marginTop: 12 }}>
            <div className="card resultsTableWrap">
              {y.title && <h3 style={{ marginTop: 0 }}>{y.title}</h3>}
              <table className="table resultsTable">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>TOTAL</th>
                    <th>Bowl</th>
                    <th>Pool</th>
                    <th>Darts</th>
                  </tr>
                </thead>
                <tbody>
                  {y.rows.map((r) => (
                    <tr key={`${y.year}-${r.participant}`}>
                      <th>{r.participant}</th>
                      <td>{r.total}</td>
                      <td>{r.bowl}</td>
                      <td>{r.pool}</td>
                      <td>{r.darts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {y.note && (
                <p className="subtle" style={{ marginTop: 10, fontStyle: 'italic' }}>
                  {y.note}
                </p>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Commentary</h3>
              {y.commentary.length > 0 ? (
                y.commentary.map((p) => (
                  <p key={p} className="subtle" style={{ margin: '0 0 10px', lineHeight: 1.6 }}>
                    {p}
                  </p>
                ))
              ) : (
                <p className="subtle">—</p>
              )}

              {y.quotes.length > 0 && (
                <>
                  <div className="rule" style={{ margin: '12px 0' }} />
                  <h3>Athlete Quotes</h3>
                  <ul className="bullets">
                    {y.quotes.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
