'use client';

import { usePathname } from 'next/navigation';

function IconChip(props: { label: string; emoji: string }) {
  return (
    <div
      aria-label={props.label}
      title={props.label}
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.18)',
        fontSize: 22
      }}
    >
      {props.emoji}
    </div>
  );
}

export default function AdminScoringEventIcon() {
  const pathname = usePathname();

  if (pathname.includes('/admin/scoring/bowling')) return <IconChip label="Bowling" emoji="🎳" />;
  if (pathname.includes('/admin/scoring/pool')) return <IconChip label="Pool" emoji="🎱" />;
  if (pathname.includes('/admin/scoring/darts')) return <IconChip label="Darts" emoji="🎯" />;
  return <IconChip label="Setup" emoji="🧾" />;
}
