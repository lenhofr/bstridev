'use client';

import { useEffect, useState } from 'react';

import { getAccessToken, handleOAuthCallback, startLogin } from '../../../lib/cognito-auth';
import { hasBackendConfig } from '../../../lib/runtime-config';

function getReturnTo(): string {
  try {
    const p = `${window.location.pathname}${window.location.search}`;
    return p.startsWith('/admin/scoring') ? p : '/admin/scoring';
  } catch {
    return '/admin/scoring';
  }
}

export default function AdminScoringAuthGate(props: { children: React.ReactNode }) {
  const backend = hasBackendConfig();
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!backend) return;
    handleOAuthCallback().finally(() => forceRender((n) => n + 1));
  }, [backend]);

  const authed = !backend || Boolean(getAccessToken());


  if (!authed) {
    return (
      <div style={{ padding: 16 }}>
        <h1 className="panelTitle" style={{ marginBottom: 12 }}>
          Admin Scoring
        </h1>
        <button
          onClick={() => {
            const returnTo = getReturnTo();
            startLogin({ returnTo }).catch(() => {
              // If login cannot start, the user can try again.
            });
          }}
        >
          Login
        </button>
      </div>
    );
  }

  return <>{props.children}</>;
}
