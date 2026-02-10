'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Events' },
  { href: '/rules', label: 'Rules' },
  { href: '/payouts', label: 'Payouts / Scoring' }
];

function closeDropdown(target: EventTarget | null) {
  let el: HTMLElement | null = target as HTMLElement | null;
  while (el) {
    const details = el.closest('details');
    if (!details) return;
    details.removeAttribute('open');
    el = details.parentElement;
  }
}

export function TopNav() {
  const pathname = usePathname();
  const pastResultsActive = pathname.startsWith('/past-results');

  return (
    <header className="topbar">
      <div className="brand">
        <Link className="brandTitle" href="/">
          Bar Sports Triathlon
        </Link>
      </div>

      <nav className="nav" aria-label="Primary">
        <div className="navDesktop">
          {links.map((l) => (
            <Link key={l.href} href={l.href} data-active={pathname === l.href}>
              {l.label}
            </Link>
          ))}

          <details className="navDropdown">
            <summary data-active={pastResultsActive}>Past Results</summary>
            <div className="navDropdownMenu">
              <Link href="/past-results/old" onClick={(e) => closeDropdown(e.target)}>
                Old Guys
              </Link>
              <Link href="/past-results/young" onClick={(e) => closeDropdown(e.target)}>
                Young Guys
              </Link>
            </div>
          </details>

          <Link href="/contact" data-active={pathname === '/contact'}>
            Contact
          </Link>
        </div>

        <details className="navMobile">
          <summary aria-label="Open menu">
            <span className="hamburger" aria-hidden="true">
              ☰
            </span>
            <span className="srOnly">Menu</span>
          </summary>
          <div className="navMobileMenu">
            <Link href="/" onClick={(e) => closeDropdown(e.target)}>
              Events
            </Link>

            <details className="navMobileSub">
              <summary>Past Results</summary>
              <div className="navMobileSubMenu">
                <Link href="/past-results/old" onClick={(e) => closeDropdown(e.target)}>
                  Old Guys
                </Link>
                <Link href="/past-results/young" onClick={(e) => closeDropdown(e.target)}>
                  Young Guys
                </Link>
              </div>
            </details>

            <Link href="/rules" onClick={(e) => closeDropdown(e.target)}>
              Rules
            </Link>
            <Link href="/payouts" onClick={(e) => closeDropdown(e.target)}>
              Payouts / Scoring
            </Link>
            <Link href="/contact" onClick={(e) => closeDropdown(e.target)} data-active={pathname === '/contact'}>
              Contact
            </Link>
          </div>
        </details>
      </nav>
    </header>
  );
}
