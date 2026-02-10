'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Events' },
  { href: '/rules', label: 'Rules' },
  { href: '/payouts', label: 'Payouts / Scoring' }
];

function closeDropdown(target: EventTarget | null) {
  (target as HTMLElement | null)?.closest('details')?.removeAttribute('open');
}

export function TopNav() {
  const pathname = usePathname();
  const pastResultsActive = pathname === '/past-results';

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

        <details className="navDropdown">
          <summary data-active={pastResultsActive}>Past Results</summary>
          <div className="navDropdownMenu">
            <Link href="/past-results" onClick={(e) => closeDropdown(e.target)}>
              All
            </Link>
            <Link href="/past-results/old" onClick={(e) => closeDropdown(e.target)}>
              Old Guys
            </Link>
            <Link href="/past-results/young" onClick={(e) => closeDropdown(e.target)}>
              Young Guys
            </Link>
          </div>
        </details>

        <a href="mailto:barsportstriathlon@gmail.com">Contact BST</a>
      </nav>
    </header>
  );
}
