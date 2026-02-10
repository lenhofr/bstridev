import Link from 'next/link';

import { PanelIcons } from '../_components/PanelIcons';

export default function PastResults() {
  return (
    <>
      <PanelIcons />
      <h1 className="panelTitle">Past Results</h1>
      <p className="kicker">No combined view — pick your bracket.</p>

      <div className="grid2" style={{ marginTop: 14 }}>
        <section className="card">
          <h3>Old Guys</h3>
          <p className="subtle" style={{ marginBottom: 10 }}>
            The original.
          </p>
          <Link href="/past-results/old">View Old Guys Results →</Link>
        </section>

        <section className="card">
          <h3>Young Guys</h3>
          <p className="subtle" style={{ marginBottom: 10 }}>
            Next generation.
          </p>
          <Link href="/past-results/young">View Young Guys Results →</Link>
        </section>
      </div>
    </>
  );
}
