import Link from 'next/link';
import type { ReactNode } from 'react';

export type AppKey = 'home' | 'cases' | 'people' | 'campaigns' | 'reports';

const I = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  cases: <path d="M3 5h18v10H3zM3 15l3 4h12l3-4" />,
  people: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  campaigns: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  reports: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
};

const APPS: { key: AppKey; label: string; href: string }[] = [
  { key: 'home', label: 'Mock data', href: '/' },
  { key: 'cases', label: 'Case Router', href: '/cases' },
  { key: 'people', label: 'Accounts', href: '/tables/accounts' },
  { key: 'campaigns', label: 'Client Comms', href: '/campaigns' },
  { key: 'reports', label: 'Routing performance', href: '/cases/performance' },
];

/**
 * Shared Mandala shell: 64px app rail, 232px sidebar, header with breadcrumb + search.
 * Each page passes its own sidebar, breadcrumb and search box.
 */
export function AppShell(props: {
  active: AppKey;
  crumb: string;
  sidebar: ReactNode;
  search: ReactNode;
  avatar: string;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <nav className="rail" aria-label="Apps">
        <div className="logo" aria-label="Magnite">M</div>
        <button className="rail-new" aria-label="New">+</button>
        {APPS.map((a) => (
          <Link key={a.key} href={a.href} aria-label={a.label} title={a.label} className={'rail-icon' + (a.key === props.active ? ' on' : '')} aria-current={a.key === props.active ? 'page' : undefined}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">{I[a.key]}</svg>
          </Link>
        ))}
      </nav>
      <aside className="sidebar">{props.sidebar}</aside>
      <main className="main">
        <header className="topbar">
          <div className="crumb">Magnite <span>/ Mandala / {props.crumb}</span></div>
          {props.search}
          <div className="topbar-right">
            <div className="avatar" aria-label="Signed in user">{props.avatar}</div>
          </div>
        </header>
        {props.children}
      </main>
    </div>
  );
}
