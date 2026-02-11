'use client';

import { useEffect, useState } from 'react';

import { useScoring } from './scoring-context';

type Flash = { message: string; at: number } | null;

export default function ActionsBar() {
  const { eventId, year, doc, onSaveDraft, onPublish } = useScoring();
  const [flash, setFlash] = useState<Flash>(null);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(t);
  }, [flash]);

  return (
    <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
      <div style={{ fontSize: 12, opacity: 0.9 }}>
        Editing: <code>{eventId}</code> ({year}) • Status: <b>{doc.status}</b>
        {flash && (
          <span style={{ marginLeft: 10, color: '#1b5e20' }}>
            {flash.message}
          </span>
        )}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            onSaveDraft();
            setFlash({ message: 'Saved', at: Date.now() });
          }}
        >
          Save TRI
        </button>
        <button
          onClick={() => {
            onPublish();
            setFlash({ message: 'Published', at: Date.now() });
          }}
        >
          Publish
        </button>
      </div>
    </div>
  );
}
