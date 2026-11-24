import Link from "next/link";

/**
 * Prototype A's copy of the Mandala frame: 64px app rail and the top bar with
 * breadcrumb, search, bell and avatar. Kept inside the case-router lane so it
 * cannot collide with the Client Comms shell; styles live in case-router.css.
 */

type AppKey = "home" | "cases" | "people" | "campaigns" | "reports";

const ICON: Record<AppKey, React.ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  cases: <path d="M3 5h18v10H3zM3 15l3 4h12l3-4" />,
  people: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  campaigns: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  reports: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
};

const APPS: { key: AppKey; label: string; href: string }[] = [
  { key: "home", label: "Mock data", href: "/" },
  { key: "cases", label: "Case Router", href: "/cases" },
  { key: "people", label: "Accounts", href: "/tables/accounts" },
  { key: "campaigns", label: "Client Comms", href: "/campaigns" },
  { key: "reports", label: "Routing performance", href: "/routing-performance" },
];

export function Rail({ active }: { active: AppKey }) {
  return (
    <nav className="rail" aria-label="Apps">
      <div className="logo" aria-label="Magnite">M</div>
      <button className="rail-new" type="button" aria-label="New">+</button>
      {APPS.map((a) => (
        <Link
          key={a.key}
          href={a.href}
          aria-label={a.label}
          title={a.label}
          className={`rail-icon${a.key === active ? " on" : ""}`}
          aria-current={a.key === active ? "page" : undefined}
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            {ICON[a.key]}
          </svg>
        </Link>
      ))}
      <Link href="/" className="rail-icon rail-gear" aria-label="Settings" title="Settings">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </Link>
    </nav>
  );
}

export function TopBar(props: { crumb: string; placeholder: string; action: string; query?: string; avatar: string; bell?: boolean }) {
  return (
    <header className="topbar">
      <div className="crumb">
        <b>Magnite</b> <span>/ Mandala / {props.crumb}</span>
      </div>
      <form className="search" action={props.action} method="get" role="search">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input name="q" placeholder={props.placeholder} defaultValue={props.query ?? ""} aria-label={props.placeholder} />
      </form>
      <div className="top-right">
        {props.bell !== false && (
          <button className="icon-btn" type="button" aria-label="Notifications">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0" />
            </svg>
          </button>
        )}
        <div className="avatar" aria-label="Signed in user">{props.avatar}</div>
      </div>
    </header>
  );
}
