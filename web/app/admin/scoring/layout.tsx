import { ScoringProvider } from './scoring-context';
import AdminScoringEventIcon from './event-icon';

import AdminScoringAuthGate from './auth-gate';
import ActionsBar from './top-actions';
import AdminScoringTabs from './tabs';

export default function AdminScoringLayout(props: { children: React.ReactNode }) {
  return (
    <AdminScoringAuthGate>
      <ScoringProvider>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 className="panelTitle" style={{ marginBottom: 4 }}>
                Admin Scoring
              </h1>
            </div>
            <AdminScoringEventIcon />
          </div>

          <ActionsBar />

          <AdminScoringTabs />

          {props.children}
        </div>
      </ScoringProvider>
    </AdminScoringAuthGate>
  );
}
