'use client';

import { useEffect, useMemo, useState } from 'react';

import { getAccessToken, handleOAuthCallback, logout, startLogin } from '../../../lib/cognito-auth';
import { apiPutActiveTriathlon } from '../../../lib/scoring-api';
import { setLocalActiveEventId } from '../../../lib/active-triathlon';
import { hasBackendConfig, runtimeConfig } from '../../../lib/runtime-config';

import { useScoring } from './scoring-context';

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
  const { eventId, year, doc, onSaveDraft, onPublish, flash, setFlash } = useScoring();

  const backend = useMemo(() => hasBackendConfig(), []);
  const [isAuthed, setIsAuthed] = useState(false);

  function refreshAuth() {
    setIsAuthed(Boolean(getAccessToken()));
  }

  useEffect(() => {
    handleOAuthCallback()
      .then(({ didHandle, error }) => {
        if (didHandle && error) setFlash({ message: `Login error: ${error}`, tone: 'error', at: Date.now() });
        if (didHandle && !error) setFlash({ message: 'Logged in', tone: 'success', at: Date.now() });
        refreshAuth();
      })
      .catch((e) => {
        setFlash({ message: `Login error: ${(e as Error)?.message ?? String(e)}`, tone: 'error', at: Date.now() });
        refreshAuth();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDisabled = !eventId.trim() || (backend && !isAuthed);

  return (
    <>
      {flash ? (
        <div className="bstTopBanner" data-tone={flash.tone} role={flash.tone === 'error' ? 'alert' : 'status'}>
          <div className="bstTopBannerInner">
            <span className="bstTopBannerIcon" aria-hidden="true">
              {flash.tone === 'success' ? '✓' : flash.tone === 'error' ? '⚠' : 'ℹ'}
            </span>
            <span className="bstTopBannerMessage">{flash.message}</span>
            <button className="bstTopBannerClose" aria-label="Dismiss" onClick={() => setFlash(null)}>
              ×
            </button>
          </div>
        </div>
      ) : null}

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
                  startLogin().catch((e) =>
                    setFlash({ message: (e as Error)?.message ?? String(e), tone: 'error', at: Date.now() })
                  );
                }}
              >
                Login
              </button>
            )
          ) : null}
          <button
            disabled={saveDisabled}
            title={saveDisabled ? (!eventId.trim() ? 'Select a triathlon first' : 'Login required') : undefined}
            onClick={async () => {
              try {
                await onSaveDraft();
                setFlash({ message: 'Saved', tone: 'success', at: Date.now() });
              } catch (e) {
                setFlash({ message: (e as Error)?.message ?? String(e), tone: 'error', at: Date.now() });
              }
            }}
          >
            Save
          </button>

          <button
            disabled={!eventId.trim() || (backend && !isAuthed)}
            title={!eventId.trim() ? 'Select a triathlon first' : backend && !isAuthed ? 'Login required' : undefined}
            onClick={async () => {
              try {
                if (backend) {
                  const accessToken = getAccessToken();
                  if (!accessToken) throw new Error('Not logged in (Cognito)');
                  if (!runtimeConfig.scoringApiBaseUrl) throw new Error('Missing scoringApiBaseUrl');
                  await apiPutActiveTriathlon({ apiBaseUrl: runtimeConfig.scoringApiBaseUrl, accessToken, activeEventId: eventId });
                } else {
                  setLocalActiveEventId(eventId);
                }
                setFlash({ message: 'Set as active triathlon', tone: 'success', at: Date.now() });
              } catch (e) {
                setFlash({ message: (e as Error)?.message ?? String(e), tone: 'error', at: Date.now() });
              }
            }}
          >
            Set Active
          </button>
          <button
            disabled={saveDisabled}
            title={saveDisabled ? (!eventId.trim() ? 'Select a triathlon first' : 'Login required') : undefined}
            onClick={async () => {
              try {
                await onPublish();
                setFlash({ message: 'Published', tone: 'success', at: Date.now() });
              } catch (e) {
                setFlash({ message: (e as Error)?.message ?? String(e), tone: 'error', at: Date.now() });
              }
            }}
          >
            Publish
          </button>
        </div>
      </div>

        {backend && !isAuthed ? <div style={{ fontSize: 12, color: '#b00020' }}>Login required to save/publish.</div> : null}
      </div>
    </>
  );
}
