import Link from 'next/link';

import { ScoringProvider } from './scoring-context';
import AdminScoringEventIcon from './event-icon';

import ActionsBar from './top-actions';

export default function AdminScoringLayout(props: { children: React.ReactNode }) {
  return (
    <ScoringProvider>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="panelTitle" style={{ marginBottom: 4 }}>
              Admin Scoring
            </h1>
            <p className="kicker" style={{ marginTop: 0 }}>
              Uses localStorage by default; when configured, uses the AWS backend (Cognito + API + DynamoDB).
            </p>
          </div>
          <AdminScoringEventIcon />
        </div>

        <ActionsBar />

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '10px 0 16px' }}>
          <Link href="/admin/scoring">Setup</Link>
          <Link href="/admin/scoring/bowling">Bowling</Link>
          <Link href="/admin/scoring/pool">Pool</Link>
          <Link href="/admin/scoring/darts">Darts</Link>
          <Link href="/scoring">Published (view)</Link>
        </div>

        {props.children}
      </div>
    </ScoringProvider>
  );
}
