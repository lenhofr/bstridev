'use client';

import { useEffect, useMemo, useState } from 'react';

import { getAccessToken, handleOAuthCallback, logout, startLogin } from '../../../lib/cognito-auth';
import { hasBackendConfig } from '../../../lib/runtime-config';

import { useScoring } from './scoring-context';

type Flash = { message: string; at: number } | null;

export default function ActionsBar() {
  const { eventId, year, doc, onSaveDraft, onPublish } = useScoring();
  const [flash, setFlash] = useState<Flash>(null);

  const backend = useMemo(() => hasBackendConfig(), []);
  const [isAuthed, setIsAuthed] = useState(false);

  function refreshAuth() {
    setIsAuthed(Boolean(getAccessToken()));
  }

  useEffect(() => {
    handleOAuthCallback()
      .then(({ didHandle, error }) => {
        if (didHandle && error) setFlash({ message: `Login error: ${error}`, at: Date.now() });
        if (didHandle && !error) setFlash({ message: 'Logged in', at: Date.now() });
        refreshAuth();
      })
      .catch((e) => {
        setFlash({ message: `Login error: ${(e as Error)?.message ?? String(e)}`, at: Date.now() });
        refreshAuth();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(t);
  }, [flash]);

  return (
    <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
      <div style={{ fontSize: 12, opacity: 0.9 }}>
        Editing: <code>{eventId}</code> ({year}) • Status: <b>{doc.status}</b> • Storage:{' '}
        <b>{backend ? 'AWS' : 'localStorage'}</b>
        {backend ? <span style={{ opacity: 0.9 }}> ({isAuthed ? 'authed' : 'not logged in'})</span> : null}
        {flash && (
          <span style={{ marginLeft: 10, color: '#1b5e20' }}>
            {flash.message}
          </span>
        )}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {backend ? (
          isAuthed ? (
            <button onClick={() => logout()}>Logout</button>
          ) : (
            <button
              onClick={() => {
                startLogin().catch((e) => setFlash({ message: (e as Error)?.message ?? String(e), at: Date.now() }));
              }}
            >
              Login
            </button>
          )
        ) : null}
        <button
          onClick={async () => {
            try {
              await onSaveDraft();
              setFlash({ message: 'Saved', at: Date.now() });
            } catch (e) {
              setFlash({ message: (e as Error)?.message ?? String(e), at: Date.now() });
            }
          }}
        >
          Save TRI
        </button>
        <button
          onClick={async () => {
            try {
              await onPublish();
              setFlash({ message: 'Published', at: Date.now() });
            } catch (e) {
              setFlash({ message: (e as Error)?.message ?? String(e), at: Date.now() });
            }
          }}
        >
          Publish
        </button>
      </div>
    </div>
  );
}
