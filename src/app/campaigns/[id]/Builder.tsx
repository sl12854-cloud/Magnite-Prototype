'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { AppShell } from '@/components/AppShell';
import { Pill } from '@/components/Pill';
import { LAST_EDIT_RATE, REGION_NAMES, type Campaign } from '@/lib/campaigns';
import { chipsFor, parseAudience, removeFilter, SEGMENT_RULE, type AudienceContact, type AudienceFilters, type AudienceResult, type Chip } from '@/lib/audience';
import { draftFor, langFor, type Draft } from '@/lib/drafts';
import { loadState, saveState, clearState, type BuilderState, type ReviewAction, type HistoryEntry } from '@/lib/campaignState';
import { longDate, num } from '@/lib/format';
import { runAudience } from '../actions';

type Tab = 'build' | 'performance' | 'history';
type Reviews = BuilderState['reviews'];
type Drafts = BuilderState['drafts'];

const ME = 'Melissa Hillard';
const PREMIUM_REASON = 'Premium publisher (top 40), 1:1 outreach by account owner';
const LOCKED = ['Approved', 'In Marketo (draft)'];
const REGION_ORDER = ['NA', 'EMEA', 'APAC', 'JP'];

const shortName = (name: string) => name.replace(/\s*[·:(].*$/, '');
const nowIso = () => new Date().toISOString();

function defaultReviews(matches: AudienceContact[], samples: Reviews, current: Reviews = {}): Reviews {
  const out: Reviews = {};
  for (const m of matches) {
    out[m.id] = current[m.id] ?? samples[m.email] ?? (m.premium ? { action: 'Removed', reason: PREMIUM_REASON } : { action: 'Kept', reason: '' });
  }
  return out;
}

function segmentRegions(campaign: Campaign, matches: AudienceContact[]): string[] {
  const set = new Set([...campaign.regions, ...matches.map((m) => m.region)]);
  return REGION_ORDER.filter((r) => set.has(r));
}

function defaultDrafts(campaign: Campaign, name: string, regions: string[], current: Drafts = {}): Drafts {
  const out: Drafts = {};
  for (const r of regions) out[r] = current[r] ?? { ...draftFor(campaign.id, name, langFor(r), 0), variant: 0, edited: false };
  return out;
}

function initialHistory(campaign: Campaign): HistoryEntry[] {
  if (campaign.id === 'link-upsell-nov') {
    return [
      { at: '2026-11-17T10:12:00', who: ME, what: 'Created campaign from a plain-language audience' },
      { at: '2026-11-17T10:13:00', who: 'AI', what: 'Built list, split into 3 segments, flagged duplicates' },
      { at: '2026-11-17T10:20:00', who: 'AI', what: 'Drafted EN ×2 and JP ×1 (JP via internal translation)' },
      { at: '2026-11-18T14:02:00', who: 'Zach Pucci', what: 'Started revenue review' },
    ];
  }
  return [{ at: nowIso(), who: ME, what: campaign.id === 'new' ? 'Started a new campaign' : 'Opened campaign' }];
}

export function Builder(props: { campaign: Campaign; reviewer: string; sampleReviews: Reviews; initialResult: AudienceResult | null }) {
  const { campaign, reviewer, sampleReviews } = props;
  const firstMatches = props.initialResult?.matches ?? [];
  const firstRegions = segmentRegions(campaign, firstMatches);

  const fresh = (): BuilderState => ({
    name: campaign.name,
    send: campaign.send,
    status: campaign.status,
    query: campaign.query,
    filters: parseAudience(campaign.query),
    reviews: defaultReviews(firstMatches, sampleReviews),
    drafts: defaultDrafts(campaign, campaign.name, firstRegions),
    history: initialHistory(campaign),
    reviewStartedAt: campaign.status === 'Awaiting approval' ? '2026-11-18T14:02:00' : null,
  });

  const [s, setS] = useState<BuilderState>(fresh);
  const [result, setResult] = useState<AudienceResult | null>(props.initialResult);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('build');
  const [editing, setEditing] = useState(false);
  const [draftQuery, setDraftQuery] = useState(campaign.query);
  const [seg, setSeg] = useState<string>(firstRegions.includes('JP') ? 'JP' : firstRegions[0] ?? '');
  const [showSource, setShowSource] = useState(false);
  const [editedOnly, setEditedOnly] = useState(false);
  const [changeNote, setChangeNote] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const matches = result?.matches ?? [];
  const regions = useMemo(() => segmentRegions(campaign, matches), [campaign, matches]);
  const locked = LOCKED.includes(s.status);

  // Restore this viewer's saved progress (after hydration, so server and client HTML match).
  useEffect(() => {
    const saved = loadState(campaign.id);
    if (saved) {
      setS(saved);
      setDraftQuery(saved.query);
      if (JSON.stringify(saved.filters) !== JSON.stringify(parseAudience(campaign.query))) {
        startTransition(async () => setResult(await runAudience(saved.filters)));
      }
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id]);

  useEffect(() => { if (loaded) saveState(campaign.id, s); }, [loaded, campaign.id, s]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { if (regions.length && !regions.includes(seg)) setSeg(regions.includes('JP') ? 'JP' : regions[0]); }, [regions, seg]);

  const log = (what: string, who = ME): HistoryEntry => ({ at: nowIso(), who, what });

  const rebuild = (filters: AudienceFilters, query: string, why: string) => {
    startTransition(async () => {
      const r = await runAudience(filters);
      setResult(r);
      setS((p) => {
        const regs = segmentRegions(campaign, r.matches);
        return {
          ...p, query, filters,
          reviews: defaultReviews(r.matches, sampleReviews, p.reviews),
          drafts: defaultDrafts(campaign, p.name, regs, p.drafts),
          history: [...p.history, log(`${why}: ${r.matches.length} contacts match`, 'AI')],
        };
      });
    });
  };

  // ----- derived numbers
  const reviewOf = (id: string) => s.reviews[id] ?? { action: 'Kept' as ReviewAction, reason: '' };
  const edits = matches.filter((m) => reviewOf(m.id).action !== 'Kept').length;
  const editRate = matches.length ? (edits / matches.length) * 100 : 0;
  const segCount = (r: string) => matches.filter((m) => m.region === r && reviewOf(m.id).action !== 'Removed').length;
  const premiumCount = matches.filter((m) => m.premium).length;
  const enCount = regions.filter((r) => langFor(r) === 'EN').length;
  const jpCount = regions.length - enCount;
  const vettingMin = s.reviewStartedAt ? (campaign.id === 'link-upsell-nov' ? 22 : Math.max(1, edits * 3)) : 0;

  // ----- status transitions
  const setStatus = (status: string, what: string, extra: Partial<BuilderState> = {}) =>
    setS((p) => ({ ...p, ...extra, status, history: [...p.history, log(what, status === 'Approved' || status === 'Changes requested' ? 'Zach Pucci' : ME)] }));

  const submit = () => {
    if (!matches.length) return setToast('Build a list with at least one contact first.');
    setStatus('Awaiting approval', `Submitted ${matches.length} contacts and ${regions.length} drafts for revenue approval`, { reviewStartedAt: nowIso() });
    setToast(`Sent to ${reviewer} for approval.`);
  };
  const approve = () => { setStatus('Approved', `Approved list and drafts (${edits} of ${matches.length} contacts edited)`); setToast('Approved. You can now send it to Marketo as a draft.'); };
  const requestChanges = () => {
    const note = (changeNote ?? '').trim();
    setStatus('Changes requested', note ? `Requested changes: ${note}` : 'Requested changes');
    setChangeNote(null);
  };
  const toMarketo = () => { setStatus('In Marketo (draft)', `Sent ${regions.length} drafts and ${num(matches.length - matches.filter((m) => reviewOf(m.id).action === 'Removed').length)} contacts to Marketo as a draft`); setToast('Created as a draft in Marketo. Nothing has been sent to clients.'); };
  const reopen = () => setStatus('Awaiting approval', 'Reopened revenue review');

  const setReview = (m: AudienceContact, patch: Partial<{ action: ReviewAction; reason: string }>) =>
    setS((p) => {
      const prev = p.reviews[m.id] ?? { action: 'Kept' as ReviewAction, reason: '' };
      const next = { ...prev, ...patch };
      const history = patch.action && patch.action !== prev.action ? [...p.history, log(`${next.action}: ${m.name} (${m.account})`, 'Zach Pucci')] : p.history;
      return { ...p, reviews: { ...p.reviews, [m.id]: next }, history };
    });

  const setDraft = (r: string, patch: Partial<Draft>) =>
    setS((p) => ({ ...p, drafts: { ...p.drafts, [r]: { ...p.drafts[r], ...patch, edited: true } } }));

  const regenerate = (r: string) =>
    setS((p) => {
      const v = (p.drafts[r]?.variant ?? 0) + 1;
      return { ...p, drafts: { ...p.drafts, [r]: { ...draftFor(campaign.id, p.name, langFor(r), v), variant: v, edited: false } }, history: [...p.history, log(`Regenerated ${REGION_NAMES[r]} draft`, 'AI')] };
    });

  const reset = () => {
    clearState(campaign.id);
    setS(fresh());
    setDraftQuery(campaign.query);
    setResult(props.initialResult);
    setToast('Reset to the sample state.');
  };

  // ----- step cards
  const reviewStep = (() => {
    switch (s.status) {
      case 'Awaiting approval': return { tone: 'amber', text: `In review · ${edits} edits so far` };
      case 'Approved': return { tone: 'green', text: `Approved · ${edits} edits` };
      case 'In Marketo (draft)': return { tone: 'green', text: 'Approved · in Marketo as draft' };
      case 'Changes requested': return { tone: 'red', text: 'Changes requested' };
      default: return { tone: 'grey', text: 'Not submitted yet' };
    }
  })();
  const steps = [
    { id: 'audience', n: 1, title: 'Audience', tone: matches.length ? 'blue' : 'grey', text: matches.length ? `Done · ${num(matches.length)} contact${matches.length === 1 ? "" : "s"}` : 'Describe who to reach' },
    { id: 'segments', n: 2, title: 'Segments', tone: regions.length ? 'blue' : 'grey', text: regions.length ? `Done · ${regions.length} segment${regions.length === 1 ? "" : "s"}` : 'Waiting on audience' },
    { id: 'drafts', n: 3, title: 'Drafts', tone: regions.length ? 'blue' : 'grey', text: regions.length ? `Done · ${[enCount && `EN ×${enCount}`, jpCount && `JP ×${jpCount}`].filter(Boolean).join(', ')}` : 'Waiting on segments' },
    { id: 'approval', n: 4, title: 'Revenue approval', tone: reviewStep.tone, text: reviewStep.text },
  ];

  const chips = chipsFor(s.filters);
  const d = s.drafts[seg];
  const visibleRows = editedOnly ? matches.filter((m) => reviewOf(m.id).action !== 'Kept') : matches;

  const search = (
    <label className="global-search">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C8C8C" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
      <input type="search" placeholder="Search campaigns" aria-label="Search campaigns"
        onKeyDown={(e) => { if (e.key === 'Enter') window.location.href = `/campaigns?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`; }} />
    </label>
  );

  return (
    <AppShell active="campaigns" crumb="Client Comms" avatar="MH" search={search}>
      <section className="page b2">
        {/* Header */}
        <div className="page-head">
          <div className="title-row">
            <Link href="/campaigns" className="back" aria-label="Back to campaigns">←</Link>
            {editing ? (
              <input className="title-input" value={s.name} aria-label="Campaign name" autoFocus
                onChange={(e) => setS((p) => ({ ...p, name: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && setEditing(false)} />
            ) : (
              <h1 className="page-title">{s.name}</h1>
            )}
            <Pill status={s.status} />
          </div>
          <div className="head-actions">
            <button className="btn" onClick={() => setEditing((v) => !v)} disabled={locked && !editing}>{editing ? 'Done' : 'Edit'}</button>
            <button className="btn btn-primary" onClick={toMarketo} disabled={s.status !== 'Approved'}
              title={s.status === 'Approved' ? 'Creates a draft in Marketo. Nothing sends to clients.' : s.status === 'In Marketo (draft)' ? 'Already in Marketo' : 'Available after revenue approval'}>
              {s.status === 'In Marketo (draft)' ? 'In Marketo as draft ✓' : 'Send to Marketo as draft'}
            </button>
          </div>
        </div>
        <p className="meta">
          Created by <b>{campaign.owner}</b> · Reviewer <b>{reviewer}</b> · Planned send{' '}
          {editing ? (
            <input type="date" className="date-input" value={s.send} aria-label="Planned send date" onChange={(e) => setS((p) => ({ ...p, send: e.target.value }))} />
          ) : (
            <b>{longDate(s.send + 'T00:00:00')}</b>
          )}
        </p>

        <div className="tabs" role="tablist">
          {(['build', 'performance', 'history'] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={'tab' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>
              {t === 'build' ? 'Build' : t === 'performance' ? 'Performance' : 'History'}
            </button>
          ))}
          <div className="tabs-right"><button className="linkish" onClick={reset}>Reset demo</button></div>
        </div>

        {tab === 'build' && (
          <>
            <div className="steps">
              {steps.map((st) => (
                <a key={st.id} href={`#${st.id}`} className={`step step-${st.tone}`}>
                  <b>{st.n} · {st.title}</b>
                  <span>{st.text}</span>
                </a>
              ))}
            </div>

            {/* 1 · Audience */}
            <div className="card" id="audience">
              <div className="card-head">
                <h2>1 · Audience, in plain language</h2>
                <span className="hint">The AI turns this into Salesforce filters you can see and change</span>
              </div>
              <form className="query-box" onSubmit={(e) => { e.preventDefault(); rebuild(parseAudience(draftQuery), draftQuery, 'Rebuilt list'); }}>
                <span className="spark" aria-hidden="true">✦</span>
                <textarea value={draftQuery} rows={1} aria-label="Audience in plain language" disabled={locked}
                  placeholder="e.g. Publishers not using Magnite Link, active in Streaming in the last 90 days"
                  onChange={(e) => setDraftQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }} />
                <button className="btn btn-dark" type="submit" disabled={pending || locked || !draftQuery.trim()}>{pending ? 'Building…' : matches.length ? 'Rebuild list' : 'Build list'}</button>
              </form>
              <div className="chip-row">
                {chips.map((c: Chip) => (
                  <span key={c.label} className={'chip' + (c.required ? ' chip-req' : '')}>
                    {c.label}
                    {!c.required && !locked && (
                      <button aria-label={`Remove filter ${c.label}`} onClick={() => rebuild(removeFilter(s.filters, c.key), s.query, `Removed filter "${c.label}"`)}>×</button>
                    )}
                  </span>
                ))}
              </div>
              {result && (
                <div className="stat-row">
                  <span><b className="big">{num(matches.length)}</b> {matches.length === 1 ? "contact matches" : "contacts match"}</span>
                  <span><b className="big red">{result.excludedNoConsent}</b> excluded: no consent</span>
                  <span><b className="big red">{result.excludedNoCountry}</b> excluded: no country</span>
                  <span><b className="big amber">{result.duplicates}</b> possible duplicates flagged</span>
                </div>
              )}
              <p className="fine">Counts come live from the mock Salesforce Contact and Account tables.</p>
            </div>

            <div className="two-col">
              {/* 2 · Segments */}
              <div className="card" id="segments">
                <div className="card-head"><h2>2 · Segments</h2></div>
                <div className="table-wrap flat">
                  <table>
                    <thead><tr><th>Segment</th><th>Rule</th><th className="num">Contacts</th><th>Template</th></tr></thead>
                    <tbody>
                      {regions.map((r) => (
                        <tr key={r}>
                          <td className="strong">{REGION_NAMES[r]}</td>
                          <td className="muted-2">{SEGMENT_RULE[r]}</td>
                          <td className="num">{num(segCount(r))}</td>
                          <td>{langFor(r)} · {shortName(s.name)}</td>
                        </tr>
                      ))}
                      {!regions.length && <tr><td colSpan={4} className="empty">Build a list to see segments.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <p className="fine">
                  Premium publishers (top 40 by revenue) are pulled out automatically and handed to account owners for 1:1 outreach.
                  {premiumCount > 0 && <> This list has <b>{premiumCount}</b>.</>}
                </p>
              </div>

              {/* 3 · Drafts */}
              <div className="card" id="drafts">
                <div className="card-head">
                  <h2>3 · Draft{seg ? ` · ${REGION_NAMES[seg]} segment (${langFor(seg)})` : ''}</h2>
                  <span className="hint">EN source → JP via internal translation</span>
                </div>
                {regions.length > 0 && d ? (
                  <>
                    <div className="seg-tabs" role="tablist">
                      {regions.map((r) => (
                        <button key={r} role="tab" aria-selected={seg === r} className={'seg-tab' + (seg === r ? ' on' : '')} onClick={() => { setSeg(r); setShowSource(false); }}>
                          {langFor(r) === 'JP' ? 'JP' : `EN · ${REGION_NAMES[r]}`}{s.drafts[r]?.edited ? ' •' : ''}
                        </button>
                      ))}
                    </div>
                    <div className="draft-box">
                      <label className="draft-line"><span>Subject</span>
                        <input value={d.subject} disabled={locked} onChange={(e) => setDraft(seg, { subject: e.target.value })} />
                      </label>
                      <label className="draft-line preview"><span>Preview text:</span>
                        <input value={d.preview} disabled={locked} onChange={(e) => setDraft(seg, { preview: e.target.value })} />
                      </label>
                      <textarea className="draft-body" rows={7} value={d.body} disabled={locked} aria-label="Draft body" onChange={(e) => setDraft(seg, { body: e.target.value })} />
                      <p className="fine">{'{first}'}, {'{last}'} and {'{owner}'} fill in per contact. {d.edited && <b className="amber">Edited by reviewer · kept for this segment</b>}</p>
                    </div>
                    <div className="row-actions">
                      <button className="btn" onClick={() => regenerate(seg)} disabled={locked}>Regenerate</button>
                      {langFor(seg) === 'JP' && <button className="btn" onClick={() => setShowSource((v) => !v)}>{showSource ? 'Hide EN source' : 'Show EN source'}</button>}
                    </div>
                    {showSource && langFor(seg) === 'JP' && (() => {
                      const en = draftFor(campaign.id, s.name, 'EN', d.variant);
                      return (
                        <div className="draft-box source">
                          <div className="draft-line"><span>EN subject</span><b>{en.subject}</b></div>
                          <div className="draft-line preview"><span>EN preview:</span>{en.preview}</div>
                          <pre className="source-body">{en.body}</pre>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <p className="empty">Drafts appear once the list has segments.</p>
                )}
              </div>
            </div>

            {/* 4 · Revenue approval */}
            <div className="card" id="approval">
              <div className="card-head">
                <h2>4 · Revenue approval</h2>
                <span className="hint">Nothing sends until the reviewer approves. Every edit is logged and feeds the next list.</span>
              </div>
              <div className="filters" style={{ marginBottom: 10 }}>
                <label className="toggle"><input type="checkbox" checked={editedOnly} onChange={(e) => setEditedOnly(e.target.checked)} /> Edited contacts only</label>
                {locked && <span className="fine" style={{ margin: 0 }}>Locked after approval. Reopen the review to make changes.</span>}
              </div>
              <div className="table-wrap flat">
                <table style={{ minWidth: 820 }}>
                  <thead><tr><th>Contact</th><th>Account</th><th>Segment</th><th>Reviewer action</th><th>Reason</th></tr></thead>
                  <tbody>
                    {visibleRows.map((m) => {
                      const rv = reviewOf(m.id);
                      return (
                        <tr key={m.id}>
                          <td><span className="strong">{m.name}</span><br /><span className="muted-2 small">{m.title ?? m.email}</span></td>
                          <td>{m.account}{m.premium && <span className="tag">Top 40</span>}</td>
                          <td>{REGION_NAMES[m.region]}</td>
                          <td>
                            <select className={`review review-${rv.action.toLowerCase()}`} value={rv.action} disabled={locked} aria-label={`Reviewer action for ${m.name}`}
                              onChange={(e) => setReview(m, { action: e.target.value as ReviewAction })}>
                              <option>Kept</option><option>Removed</option><option>Changed</option>
                            </select>
                          </td>
                          <td>
                            <input className="reason" value={rv.reason} disabled={locked} placeholder={rv.action === 'Kept' ? 'Reviewer confirmed' : 'Why? (required for edits)'}
                              aria-label={`Reason for ${m.name}`} onChange={(e) => setReview(m, { reason: e.target.value })} />
                          </td>
                        </tr>
                      );
                    })}
                    {!visibleRows.length && <tr><td colSpan={5} className="empty">{matches.length ? 'No edited contacts yet.' : 'No contacts in the list yet.'}</td></tr>}
                  </tbody>
                </table>
              </div>

              {changeNote !== null && (
                <form className="change-note" onSubmit={(e) => { e.preventDefault(); requestChanges(); }}>
                  <textarea autoFocus rows={2} value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="What should change? The campaign owner sees this note." aria-label="Requested changes" />
                  <div className="row-actions">
                    <button type="button" className="btn" onClick={() => setChangeNote(null)}>Cancel</button>
                    <button type="submit" className="btn btn-danger">Send back to owner</button>
                  </div>
                </form>
              )}

              <div className="approval-foot">
                <span>
                  {edits} of {num(matches.length)} contacts edited ({editRate.toFixed(1)}%) · last campaign {LAST_EDIT_RATE}%
                  {s.reviewStartedAt && <> · vetting time so far <b>{vettingMin} min</b> vs. ~4 hours by hand</>}
                </span>
                <div className="row-actions">
                  {(s.status === 'Draft' || s.status === 'Changes requested') && (
                    <button className="btn btn-primary" onClick={submit} disabled={!matches.length}>Submit for revenue approval</button>
                  )}
                  {s.status === 'Awaiting approval' && changeNote === null && (
                    <>
                      <button className="btn" onClick={() => setChangeNote('')}>Request changes</button>
                      <button className="btn btn-green" onClick={approve}>Approve list and drafts</button>
                    </>
                  )}
                  {s.status === 'Approved' && <button className="btn" onClick={reopen}>Reopen review</button>}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'performance' && (
          <div className="card">
            {campaign.opened != null ? (
              <div className="kpis">
                <div><span>Contacts sent</span><b>{num(campaign.contacts)}</b></div>
                <div><span>Opened</span><b>{campaign.opened}%</b></div>
                <div><span>Clicked</span><b>{campaign.clicked}%</b></div>
                <div><span>Edits by revenue</span><b>{campaign.edits}</b><small>{((campaign.edits / campaign.contacts) * 100).toFixed(1)}% of contacts</small></div>
              </div>
            ) : (
              <p className="empty">Not sent yet. Opens and clicks appear here after Marketo sends the approved draft.</p>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="card">
            <ol className="history">
              {[...s.history].reverse().map((h, i) => (
                <li key={i}><span className="when">{new Date(h.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span><b>{h.who}</b> {h.what}</li>
              ))}
            </ol>
          </div>
        )}

        {toast && <div className="toast" role="status">{toast}</div>}
      </section>
    </AppShell>
  );
}
