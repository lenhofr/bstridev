'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
    { href: '/admin/scoring/darts', label: 'Darts' }
  ];

  return (
    <nav
      aria-label="Admin scoring sections"
      style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', margin: '10px 0 16px' }}
    >
      <div className="tabs">
        {tabs.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className="tab"
              data-active={active}
              aria-current={active ? 'page' : undefined}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div style={{ marginLeft: 'auto' }}>
        <div className="tabs">
          <Link href="/scoring" className="tab">
            View published
          </Link>
        </div>
      </div>
    </nav>
  );
}
