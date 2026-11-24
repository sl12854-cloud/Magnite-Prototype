'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { Pill } from '@/components/Pill';
import { REGIONS, REGION_NAMES, type Campaign, type CampaignStatus } from '@/lib/campaigns';
import { num, shortDate } from '@/lib/format';

export type ViewKey = 'campaigns' | 'drafts' | 'segments' | 'templates' | 'approvals';
export type AudienceHealth = { total: number; eligiblePct: number; duplicates: number; eligibleByRegion: Record<string, number> };
type Template = { name: string; lang: string; updated: string; used: number };

type SortKey = 'name' | 'contacts' | 'edits' | 'opened' | 'clicked' | 'send';
type SendRange = 'any' | 'upcoming' | 'last30' | 'last90';
type Filters = { sendRange: SendRange; regions: string[]; statuses: CampaignStatus[] };
type SavedView = { id: string; name: string; filters: Filters };
type ColKey = 'query' | 'segments' | 'contacts' | 'edits' | 'opened' | 'clicked' | 'send' | 'status';

const COLS: { key: ColKey; label: string }[] = [
  { key: 'query', label: 'Audience (plain-language query)' },
  { key: 'segments', label: 'Segments' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'edits', label: 'Edits by revenue' },
  { key: 'opened', label: 'Opened' },
  { key: 'clicked', label: 'Clicked' },
  { key: 'send', label: 'Send date' },
  { key: 'status', label: 'Status' },
];
const STATUSES: CampaignStatus[] = ['Awaiting approval', 'Approved', 'Sent', 'Handed off'];
const SEND_LABEL: Record<SendRange, string> = { any: 'Any time', upcoming: 'Upcoming', last30: 'Last 30 days', last90: 'Last 90 days' };
const EMPTY: Filters = { sendRange: 'any', regions: [], statuses: [] };
const VIEW_TITLE: Record<ViewKey, string> = { campaigns: 'Campaigns', drafts: 'Drafts', segments: 'Segments', templates: 'Templates (EN / JP)', approvals: 'Approvals' };

// Per-viewer conveniences only; everything still works when storage is unavailable.
const store = {
  get<T>(k: string, fallback: T): T {
    try { const v = localStorage.getItem('b1.' + k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
  },
  set(k: string, v: unknown) {
    try { localStorage.setItem('b1.' + k, JSON.stringify(v)); } catch { /* ignore */ }
  },
};

function segLabel(c: Campaign) {
  const n = Math.max(c.regions.length, 1);
  if (c.segmentLabel) return `${n} · ${c.segmentLabel}`;
  return c.regions.length ? `${n} · ${c.regions.join(' / ')}` : '1';
}

/** "Today" for date filters. Pinned to the wireframe date so sample data stays meaningful. */
const TODAY = new Date('2026-11-24T00:00:00');

function inSendRange(c: Campaign, r: SendRange) {
  if (r === 'any') return true;
  const d = new Date(c.send + 'T00:00:00');
  const days = (TODAY.getTime() - d.getTime()) / 86400000;
  if (r === 'upcoming') return days <= 0;
  if (r === 'last30') return days >= 0 && days <= 30;
  return days >= 0 && days <= 90;
}

export function CampaignsView(props: { campaigns: Campaign[]; templates: Template[]; health: AudienceHealth; initialView: ViewKey; initialQuery: string }) {
  const { campaigns, templates, health } = props;
  const router = useRouter();
  const [view, setView] = useState<ViewKey>(props.initialView);
  const [globalQ, setGlobalQ] = useState(props.initialQuery);
  const [tableQ, setTableQ] = useState('');
  const [tab, setTab] = useState<string>('all');
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'send', dir: -1 });
  const [hidden, setHidden] = useState<ColKey[]>([]);
  const [compact, setCompact] = useState(false);
  const [saved, setSaved] = useState<SavedView[]>([]);
  const [naming, setNaming] = useState<string | null>(null);

  useEffect(() => {
    setHidden(store.get('hidden', []));
    setCompact(store.get('compact', false));
    setSaved(store.get('views', []));
  }, []);
  useEffect(() => store.set('hidden', hidden), [hidden]);
  useEffect(() => store.set('compact', compact), [compact]);
  useEffect(() => store.set('views', saved), [saved]);

  const goView = (v: ViewKey) => {
    setView(v);
    router.replace(v === 'campaigns' ? '/campaigns' : `/campaigns?view=${v}`, { scroll: false });
  };

  const live = campaigns.filter((c) => c.status !== 'Draft');
  const drafts = campaigns.filter((c) => c.status === 'Draft');
  const awaiting = live.filter((c) => c.status === 'Awaiting approval');
  const segments = live.flatMap((c) => (c.regions.length ? c.regions : ['ALL']).map((r) => ({ c, r })));

  // Tab = preset filter; a saved view carries its own filters.
  const tabFilter = (c: Campaign) => {
    if (tab === 'awaiting') return c.status === 'Awaiting approval';
    if (tab === 'sent') return c.status === 'Sent';
    return true;
  };
  const activeSaved = saved.find((s) => s.id === tab);
  const eff: Filters = activeSaved ? activeSaved.filters : filters;
  const setEff = (f: Filters) => {
    if (activeSaved) setSaved(saved.map((s) => (s.id === activeSaved.id ? { ...s, filters: f } : s)));
    else setFilters(f);
  };

  const rows = useMemo(() => {
    const base = view === 'drafts' ? drafts : view === 'approvals' ? awaiting : live;
    const words = (globalQ + ' ' + tableQ).toLowerCase().split(/\s+/).filter(Boolean);
    const out = base.filter((c) => {
      if (view === 'campaigns' && !tabFilter(c)) return false;
      if (!inSendRange(c, eff.sendRange)) return false;
      if (eff.regions.length && !eff.regions.some((r) => c.regions.includes(r))) return false;
      if (eff.statuses.length && !eff.statuses.includes(c.status)) return false;
      const hay = `${c.name} ${c.query} ${c.owner} ${c.regions.join(' ')} ${c.status}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    const val = (c: Campaign): number | string => {
      switch (sort.key) {
        case 'name': return c.name.toLowerCase();
        case 'send': return c.send;
        case 'opened': return c.opened ?? -1;
        case 'clicked': return c.clicked ?? -1;
        default: return c[sort.key];
      }
    };
    return [...out].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, tab, globalQ, tableQ, eff, sort, campaigns]);

  const show = (k: ColKey) => !hidden.includes(k);
  const filterCount = (eff.sendRange !== 'any' ? 1 : 0) + eff.regions.length + eff.statuses.length;

  const sortBtn = (key: SortKey, label: string) => (
    <button onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'name' ? 1 : -1 }))} aria-label={`Sort by ${label}`}>
      {label} <span className={'sort' + (sort.key === key ? ' on' : '')}>{sort.key === key ? (sort.dir === 1 ? '↑' : '↓') : '⇅'}</span>
    </button>
  );

  const sidebar = (
    <>
      <p className="side-label">Client comms</p>
      {([
        ['campaigns', 'Campaigns', live.length],
        ['drafts', 'Drafts', drafts.length],
        ['segments', 'Segments', segments.length],
        ['templates', 'Templates (EN / JP)', templates.length],
        ['approvals', 'Approvals', awaiting.length],
      ] as [ViewKey, string, number][]).map(([k, label, n]) => (
        <a key={k} href={k === 'campaigns' ? '/campaigns' : `/campaigns?view=${k}`} className={'side-link' + (view === k ? ' on' : '')}
          aria-current={view === k ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); goView(k); }}>
          <span>{label}</span><span className="count">{n}</span>
        </a>
      ))}
      <p className="side-label" style={{ marginTop: 28 }}>Audience</p>
      <div className="side-stats" aria-label="Audience health from the Contact table">
        Contacts in sync <b>{num(health.total)}</b><br />
        With consent + country <b>{health.eligiblePct}%</b><br />
        Duplicates to merge <span className="warn">{num(health.duplicates)}</span>
      </div>
      <p className="side-foot">Sends go out through Marketo after revenue approval.</p>
    </>
  );

  const search = (
    <label className="global-search">
      <SearchIcon />
      <input type="search" value={globalQ} onChange={(e) => setGlobalQ(e.target.value)} placeholder="Search campaigns or ask for a list in plain language" aria-label="Search campaigns or ask for a list in plain language" />
    </label>
  );

  const campaignTable = (
    <>
      {view === 'campaigns' && (
        <div className="tabs" role="tablist">
          <TabBtn on={tab === 'all'} onClick={() => setTab('all')}>All campaigns</TabBtn>
          <TabBtn on={tab === 'awaiting'} onClick={() => setTab('awaiting')}>Awaiting approval <span className="n-amber">{awaiting.length}</span></TabBtn>
          <TabBtn on={tab === 'sent'} onClick={() => setTab('sent')}>Sent</TabBtn>
          {saved.map((s) => (
            <TabBtn key={s.id} on={tab === s.id} onClick={() => setTab(s.id)}>
              {s.name}
              <span role="button" tabIndex={0} className="tab-x" aria-label={`Delete view ${s.name}`}
                onClick={(e) => { e.stopPropagation(); setSaved(saved.filter((x) => x.id !== s.id)); if (tab === s.id) setTab('all'); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setSaved(saved.filter((x) => x.id !== s.id)); setTab('all'); } }}>×</span>
            </TabBtn>
          ))}
          {naming === null ? (
            <button className="tab" onClick={() => setNaming('')} title="Save the current filters as a view">+ Add view</button>
          ) : (
            <form className="tab" onSubmit={(e) => {
              e.preventDefault();
              const name = naming.trim();
              if (!name) return setNaming(null);
              const id = 'v' + Date.now();
              setSaved([...saved, { id, name, filters: eff }]);
              setTab(id); setNaming(null);
            }}>
              <input autoFocus className="inline-input" value={naming} placeholder="View name, Enter to save" aria-label="New view name"
                onChange={(e) => setNaming(e.target.value)} onBlur={() => !naming.trim() && setNaming(null)}
                onKeyDown={(e) => e.key === 'Escape' && setNaming(null)} />
            </form>
          )}
          <div className="tabs-right">
            <Popover label={<span className="linkish">View settings</span>} plain align="right">
              <div className="menu-head">Rows</div>
              <label className="menu-item"><input type="radio" checked={!compact} onChange={() => setCompact(false)} /> Comfortable</label>
              <label className="menu-item"><input type="radio" checked={compact} onChange={() => setCompact(true)} /> Compact</label>
              <div className="menu-sep" />
              <div className="menu-head">Default sort</div>
              {([['send', 'Send date, newest'], ['edits', 'Edits by revenue, most'], ['contacts', 'Contacts, most']] as [SortKey, string][]).map(([k, l]) => (
                <label key={k} className="menu-item"><input type="radio" checked={sort.key === k && sort.dir === -1} onChange={() => setSort({ key: k, dir: -1 })} /> {l}</label>
              ))}
            </Popover>
          </div>
        </div>
      )}

      <div className="filters">
        <label className="field">
          <SearchIcon size={14} />
          <input type="search" value={tableQ} onChange={(e) => setTableQ(e.target.value)} placeholder="Search" aria-label="Search this table" />
        </label>
        <Popover label={<>Send date{eff.sendRange !== 'any' ? `: ${SEND_LABEL[eff.sendRange]}` : ''}</>} active={eff.sendRange !== 'any'}>
          {(Object.keys(SEND_LABEL) as SendRange[]).map((r) => (
            <label key={r} className="menu-item"><input type="radio" name="send" checked={eff.sendRange === r} onChange={() => setEff({ ...eff, sendRange: r })} /> {SEND_LABEL[r]}</label>
          ))}
        </Popover>
        <Popover label={<>Region{eff.regions.length ? ` · ${eff.regions.length}` : ''}</>} active={eff.regions.length > 0}>
          {REGIONS.map((r) => (
            <label key={r} className="menu-item">
              <input type="checkbox" checked={eff.regions.includes(r)} onChange={() => setEff({ ...eff, regions: toggle(eff.regions, r) })} /> {REGION_NAMES[r]}
            </label>
          ))}
        </Popover>
        {view === 'campaigns' && (
          <Popover label={<>Status{eff.statuses.length ? ` · ${eff.statuses.length}` : ''}</>} active={eff.statuses.length > 0}>
            {STATUSES.map((s) => (
              <label key={s} className="menu-item">
                <input type="checkbox" checked={eff.statuses.includes(s)} onChange={() => setEff({ ...eff, statuses: toggle(eff.statuses, s) })} /> {s}
              </label>
            ))}
          </Popover>
        )}
        {filterCount > 0 && <button className="linkish" onClick={() => setEff(EMPTY)}>Clear filters</button>}
        <div className="spacer" />
        <Popover label="Manage table" align="right" noCaret>
          <div className="menu-head">Columns</div>
          {COLS.map((c) => (
            <label key={c.key} className="menu-item">
              <input type="checkbox" checked={show(c.key)} onChange={() => setHidden(toggle(hidden, c.key))} /> {c.label}
            </label>
          ))}
          <div className="menu-foot"><button className="linkish" onClick={() => setHidden([])}>Show all</button></div>
        </Popover>
      </div>

      {globalQ.trim() && rows.length === 0 && (
        <div className="banner">
          <span>No campaign matches “{globalQ.trim()}”. Want a new list built from that description?</span>
          <Link className="btn btn-primary" href={`/campaigns/new?audience=${encodeURIComponent(globalQ.trim())}`}>✦ Build list from this</Link>
        </div>
      )}

      <div className="table-wrap">
        <table className={compact ? 'compact' : undefined} style={{ minWidth: 1100 }}>
          <thead>
            <tr>
              <th>{sortBtn('name', 'Campaign')}</th>
              {show('query') && <th>Audience (plain-language query)</th>}
              {show('segments') && <th>Segments</th>}
              {show('contacts') && <th className="num">{sortBtn('contacts', 'Contacts')}</th>}
              {show('edits') && <th className="num">{sortBtn('edits', 'Edits by revenue')}</th>}
              {show('opened') && <th className="num">{sortBtn('opened', 'Opened')}</th>}
              {show('clicked') && <th className="num">{sortBtn('clicked', 'Clicked')}</th>}
              {show('send') && <th>{sortBtn('send', 'Send date')}</th>}
              {show('status') && <th>Status</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td style={{ minWidth: 220 }}><Link className="row-link" href={`/campaigns/${c.id}`}>{c.name}</Link></td>
                {show('query') && <td className="query">{c.query}</td>}
                {show('segments') && <td style={{ whiteSpace: 'nowrap' }}>{segLabel(c)}</td>}
                {show('contacts') && <td className="num">{c.contacts ? num(c.contacts) : <span className="muted">—</span>}</td>}
                {show('edits') && (
                  <td className="num">
                    {c.contacts ? (
                      <span className="edits" title={`${c.edits} of ${num(c.contacts)} contacts removed or changed by the revenue reviewer`}>
                        {c.edits}<small>{((c.edits / c.contacts) * 100).toFixed(1)}%</small>
                      </span>
                    ) : <span className="muted">—</span>}
                  </td>
                )}
                {show('opened') && <td className="num">{c.opened == null ? <span className="muted">—</span> : `${c.opened}%`}</td>}
                {show('clicked') && <td className="num">{c.clicked == null ? <span className="muted">—</span> : `${c.clicked}%`}</td>}
                {show('send') && <td style={{ whiteSpace: 'nowrap' }}>{shortDate(c.send + 'T00:00:00')}</td>}
                {show('status') && <td>{c.status === 'Draft' ? <span className="pill pill-grey">Draft</span> : <Pill status={c.status} />}</td>}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="empty">No campaigns match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="foot">
        <span>{view === 'drafts' ? `${rows.length} drafts` : view === 'approvals' ? `${rows.length} waiting on a revenue reviewer` : `${rows.length === live.length ? rows.length : `${rows.length} of ${live.length}`} campaigns since Sep 1`}</span>
        <span>“Edits by revenue” counts contacts the reviewer removed or changed before approval. Lower is better.</span>
      </div>
    </>
  );

  const segmentTable = (
    <>
      <div className="table-wrap">
        <table style={{ minWidth: 760 }}>
          <thead><tr><th>Campaign</th><th>Segment</th><th>Template</th><th className="num">Contacts in segment</th><th className="num">Eligible in Salesforce now</th><th>Status</th></tr></thead>
          <tbody>
            {segments.filter(({ c }) => matches(c, globalQ)).map(({ c, r }) => (
              <tr key={c.id + r}>
                <td><Link className="row-link" href={`/campaigns/${c.id}`}>{c.name}</Link></td>
                <td>{r === 'ALL' ? 'Single list' : REGION_NAMES[r]}</td>
                <td>{r === 'JP' ? 'JP' : 'EN'} · {c.name.split(/[:·]/)[0].trim()}</td>
                <td className="num">{num(Math.round(c.contacts / Math.max(c.regions.length, 1)))}</td>
                <td className="num">{r === 'ALL' ? <span className="muted">—</span> : num(health.eligibleByRegion[r] ?? 0)}</td>
                <td><Pill status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="foot"><span>{segments.length} segments across {live.length} campaigns</span><span>“Eligible now” = contacts in that region with consent and a country, from the Contact table.</span></div>
    </>
  );

  const templateTable = (
    <div className="table-wrap">
      <table style={{ minWidth: 560 }}>
        <thead><tr><th>Template</th><th>Language</th><th>Last updated</th><th className="num">Used by campaigns</th></tr></thead>
        <tbody>
          {templates.filter((t) => matches(t, globalQ)).map((t) => (
            <tr key={t.name + t.lang}>
              <td className="strong">{t.name}</td>
              <td><span className="chip">{t.lang}{t.lang === 'JP' ? ' · internal translation' : ' · source'}</span></td>
              <td>{shortDate(t.updated + 'T00:00:00')}</td>
              <td className="num">{t.used}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <AppShell active="campaigns" crumb="Client Comms" avatar="MH" sidebar={sidebar} search={search}>
      <section className="page">
        <div className="page-head">
          <h1 className="page-title">{VIEW_TITLE[view]}</h1>
          <select className="view-select" value={view} onChange={(e) => goView(e.target.value as ViewKey)} aria-label="Client comms view">
            {(Object.keys(VIEW_TITLE) as ViewKey[]).map((k) => <option key={k} value={k}>{VIEW_TITLE[k]}</option>)}
          </select>
          <Link className="btn btn-primary" href="/campaigns/new" style={{ marginLeft: 'auto', padding: '10px 16px', fontSize: 14 }}>+ New campaign</Link>
        </div>
        {view === 'segments' ? segmentTable : view === 'templates' ? templateTable : campaignTable}
      </section>
    </AppShell>
  );
}

/* ---------- small pieces ---------- */

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function matches(o: object, q: string) {
  const hay = Object.values(o).filter((v) => typeof v === 'string').join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return <button role="tab" aria-selected={on} className={'tab' + (on ? ' on' : '')} onClick={onClick}>{children}</button>;
}

function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#8C8C8C" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
  );
}

function Popover({ label, children, align, active, plain, noCaret }: { label: ReactNode; children: ReactNode; align?: 'right'; active?: boolean; plain?: boolean; noCaret?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className="pop" ref={ref}>
      <button className={plain ? 'linkish' : 'btn' + (active ? ' active' : '')} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label}{!plain && !noCaret && <span className="caret">▾</span>}
      </button>
      {open && <div className={'menu' + (align === 'right' ? ' right' : '')} role="menu">{children}</div>}
    </div>
  );
}
