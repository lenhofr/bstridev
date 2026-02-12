'use client';

import { useMemo } from 'react';

import { getAccessToken, logout } from '../../../lib/cognito-auth';
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

  const saveDisabled = !eventId.trim();

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
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {backend ? <button onClick={() => logout()}>Logout</button> : null}
          <button
            disabled={saveDisabled}
            title={saveDisabled ? 'Select a triathlon first' : undefined}
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
            disabled={!eventId.trim()}
            title={!eventId.trim() ? 'Select a triathlon first' : undefined}
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
            title={saveDisabled ? 'Select a triathlon first' : undefined}
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
      </div>
    </>
  );
}
