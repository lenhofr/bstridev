'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 999,
  border: '1px solid rgba(0,0,0,0.18)',
  textDecoration: 'none',
  fontSize: 13
};

const tabStyleActive: React.CSSProperties = {
  ...tabStyle,
  background: 'rgba(0,0,0,0.08)',
  borderColor: 'rgba(0,0,0,0.28)',
  fontWeight: 700
};

function isActive(pathname: string, href: string) {
  if (href === '/admin/scoring') return pathname === '/admin/scoring';
  return pathname.startsWith(href);
}

export default function AdminScoringTabs() {
  const pathname = usePathname();

  const tabs = [
    { href: '/admin/scoring', label: 'Setup' },
    { href: '/admin/scoring/bowling', label: 'Bowling' },
    { href: '/admin/scoring/pool', label: 'Pool' },
    { href: '/admin/scoring/darts', label: 'Darts' },
    { href: '/scoring', label: 'View published' }
  ];

  return (
    <nav aria-label="Admin scoring sections" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 16px' }}>
      {tabs.map((t) => {
        const active = t.href.startsWith('/admin') ? isActive(pathname, t.href) : false;
        return (
          <Link key={t.href} href={t.href} style={active ? tabStyleActive : tabStyle}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
