'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Events' },
  { href: '/past-results', label: 'Past Results' },
  { href: '/rules', label: 'Rules' },
  { href: '/payouts', label: 'Payouts / Scoring' }
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="brand">
        <Link className="brandTitle" href="/">
          Bar Sports Triathlon
        </Link>
      </div>

      <nav className="nav" aria-label="Primary">
        {links.map((l) => (
          <Link key={l.href} href={l.href} data-active={pathname === l.href}>
            {l.label}
          </Link>
        ))}
        <a href="mailto:barsportstriathlon@gmail.com">Contact BST</a>
      </nav>
    </header>
  );
}
