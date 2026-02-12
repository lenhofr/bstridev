'use client';

import { useEffect, useMemo, useState } from 'react';

import { getAccessToken, handleOAuthCallback, logout, startLogin } from '../../../lib/cognito-auth';
import { hasBackendConfig } from '../../../lib/runtime-config';

import { useScoring } from './scoring-context';

type Flash = { message: string; at: number } | null;

function badgeStyle(params?: { bg?: string; border?: string; color?: string }): React.CSSProperties {
  return {
    display: 'inline-flex',
    gap: 6,
    alignItems: 'center',
    padding: '3px 8px',
    borderRadius: 999,
    border: `1px solid ${params?.border ?? 'rgba(0,0,0,0.16)'}`,
    background: params?.bg ?? 'rgba(0,0,0,0.04)',
    color: params?.color,
    fontSize: 12,
    opacity: 0.95
  };
}

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

  const saveDisabled = backend && !isAuthed;

  return (
    <div className="card" style={{ display: 'grid', gap: 8, marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={badgeStyle()}>
            Event <code>{eventId}</code>
          </span>
          <span style={badgeStyle()}>
            Year <b>{year}</b>
          </span>
          <span style={badgeStyle()}>
            Status <b>{doc.status}</b>
          </span>
          <span style={badgeStyle()}>
            Storage <b>{backend ? 'AWS' : 'localStorage'}</b>
          </span>
          {backend ? (
            <span
              style={badgeStyle(
                isAuthed
                  ? { bg: 'rgba(27,94,32,0.08)', border: 'rgba(27,94,32,0.35)', color: '#1b5e20' }
                  : { bg: 'rgba(176,0,32,0.08)', border: 'rgba(176,0,32,0.35)', color: '#b00020' }
              )}
            >
              {isAuthed ? 'Logged in' : 'Logged out'}
            </span>
          ) : null}
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
            disabled={saveDisabled}
            title={saveDisabled ? 'Login required' : undefined}
            onClick={async () => {
              try {
                await onSaveDraft();
                setFlash({ message: 'Saved', at: Date.now() });
              } catch (e) {
                setFlash({ message: (e as Error)?.message ?? String(e), at: Date.now() });
              }
            }}
          >
            Save
          </button>
          <button
            disabled={saveDisabled}
            title={saveDisabled ? 'Login required' : undefined}
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

      {backend && !isAuthed ? <div style={{ fontSize: 12, color: '#b00020' }}>Login required to save/publish.</div> : null}
      {flash ? <div style={{ fontSize: 12, color: flash.message.startsWith('Login error:') ? '#b00020' : '#1b5e20' }}>{flash.message}</div> : null}
    </div>
  );
}
