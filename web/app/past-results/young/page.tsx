import fs from 'node:fs';
import path from 'node:path';

import { PanelIcons } from '../../_components/PanelIcons';

export default function PastResultsYoung() {
  const contentPath = path.join(process.cwd(), 'content', 'past_results_young.txt');
  const content = fs.readFileSync(contentPath, 'utf8');

  return (
    <>
      <PanelIcons />
      <h1 className="panelTitle">Past Results — Young Guys</h1>

      <div className="card" style={{ marginTop: 14 }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{content}</pre>
      </div>
    </>
  );
}
