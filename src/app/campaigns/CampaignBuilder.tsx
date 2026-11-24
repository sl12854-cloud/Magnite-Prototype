'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Pill } from '@/components/Pill';
import type { CampaignDetail, Draft, ReviewAction } from '@/lib/campaignDetail';
import { num } from '@/lib/format';

const ACTION_TONE: Record<ReviewAction, string> = { Removed: 'pill-red', Changed: 'pill-amber', Kept: 'pill-green' };
type BuildTab = 'build' | 'performance' | 'history';

/** B2 · the four-step builder for one campaign. Interactivity is client-side only. */
export function CampaignBuilder({ detail }: { detail: CampaignDetail }) {
  const [tab, setTab] = useState<BuildTab>('build');
  const [status, setStatus] = useState(detail.status);
  const [steps, setSteps] = useState(detail.steps);
  const [query, setQuery] = useState(detail.audience.query);
  const [draftKey, setDraftKey] = useState(detail.drafts[0]?.key ?? '');
  const [showSource, setShowSource] = useState(false);
  const [approved, setApproved] = useState(false);
  const [changesRequested, setChangesRequested] = useState(false);

  const draft: Draft | undefined = detail.drafts.find((d) => d.key === draftKey) ?? detail.drafts[0];
  const canApprove = !detail.isNew && status === 'Awaiting approval' && !approved;

  const approve = () => {
    setApproved(true);
    setChangesRequested(false);
    setStatus('Approved');
    setSteps((s) => s.map((st) => (st.n === 4 ? { ...st, summary: st.summary.replace(/^In review/, 'Approved').replace(' so far', ''), state: 'done' } : st)));
  };
  const requestChanges = () => {
    setChangesRequested(true);
    setSteps((s) => s.map((st) => (st.n === 4 ? { ...st, summary: 'Changes requested · back to the owner', state: 'review' } : st)));
  };

  const search = (
    <label className="global-search">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C8C8C" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
      <input type="search" placeholder="Search campaigns" aria-label="Search campaigns" />
    </label>
  );

  return (
    <AppShell active="campaigns" crumb="Client Comms" avatar="MH" sidebar={null} search={search}>
      <section className="page builder">
        <div className="page-head">
          <div className="title-row">
            <Link href="/campaigns" className="back" aria-label="Back to campaigns">←</Link>
            <h1 className="page-title">{detail.name}</h1>
            {status === 'Draft' ? <span className="pill pill-grey">Draft</span> : <Pill status={status} />}
          </div>
          <div className="actions">
            <button className="btn">Edit</button>
            <button className="btn btn-primary" title={status !== 'Approved' ? 'Creates a Marketo draft once revenue approves' : 'Create the Marketo draft'}>Send to Marketo as draft</button>
          </div>
        </div>
        <p className="meta">
          Created by <b>{detail.createdBy}</b> · Reviewer <b>{detail.reviewer}</b> · Planned send <b>{detail.plannedSend}</b>
        </p>

        <div className="tabs" role="tablist">
          {(['build', 'performance', 'history'] as BuildTab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={'tab' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab !== 'build' ? (
          <div className="panel empty-tab">
            {tab === 'performance'
              ? status === 'Sent'
                ? 'Opens and clicks for this send are on the B1 list; the per-segment breakdown is not built yet.'
                : 'Performance appears after the campaign is sent.'
              : 'Every reviewer action and list rebuild is logged here. The history view is not built yet.'}
          </div>
        ) : (
          <>
            <ol className="steps" aria-label="Builder steps">
              {steps.map((s) => (
                <li key={s.n} className={`step step-${s.state}`}>
                  <b>{s.n} · {s.title}</b>
                  <span>{s.summary}</span>
                </li>
              ))}
            </ol>

            {/* 1 · Audience */}
            <section className="panel">
              <header className="panel-head">
                <h2>1 · Audience, in plain language</h2>
                <span className="hint">The AI turns this into Salesforce filters you can see and change</span>
              </header>
              <div className="query-box">
                <span className="spark" aria-hidden="true">✦</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Describe the audience, e.g. “Publishers not using Magnite Link, active in Streaming in the last 90 days”"
                  aria-label="Audience in plain language"
                />
                <button className="btn btn-dark" disabled={!query.trim()}>{detail.isNew ? 'Build list' : 'Rebuild list'}</button>
              </div>
              {detail.audience.chips.length > 0 && (
                <div className="chip-row">
                  {detail.audience.chips.map((c) => (
                    <span key={c.label} className={'chip' + (c.required ? ' chip-required' : '')}>{c.label}</span>
                  ))}
                </div>
              )}
              {detail.isNew ? (
                <p className="muted small">Consent and country are always required; the AI adds those two filters to every list.</p>
              ) : (
                <div className="stats">
                  <span><b>{num(detail.audience.matches)}</b> contacts match</span>
                  <span><b className="red">{num(detail.audience.excludedNoConsent)}</b> excluded: no consent</span>
                  <span><b className="red">{num(detail.audience.excludedNoCountry)}</b> excluded: no country</span>
                  <span><b className="amber">{num(detail.audience.duplicates)}</b> possible duplicates flagged</span>
                </div>
              )}
            </section>

            <div className="two-col">
              {/* 2 · Segments */}
              <section className="panel">
                <header className="panel-head"><h2>2 · Segments</h2></header>
                {detail.segments.length ? (
                  <div className="table-wrap flat">
                    <table>
                      <thead><tr><th>Segment</th><th>Rule</th><th className="num">Contacts</th><th>Template</th></tr></thead>
                      <tbody>
                        {detail.segments.map((s) => (
                          <tr key={s.name}>
                            <td className="strong">{s.name}</td>
                            <td className="muted-2">{s.rule}</td>
                            <td className="num">{num(s.contacts)}</td>
                            <td>{s.template}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted small">No segments yet.</p>
                )}
                <p className="note">{detail.segmentNote}</p>
              </section>

              {/* 3 · Drafts */}
              <section className="panel">
                <header className="panel-head">
                  <h2>3 · {draft ? draftTitleFor(detail, draft) : 'Drafts'}</h2>
                  <span className="hint">{detail.draftHint}</span>
                </header>
                {draft ? (
                  <>
                    <div className="chip-row" role="tablist" aria-label="Draft per segment">
                      {detail.drafts.map((d) => (
                        <button key={d.key} role="tab" aria-selected={d.key === draft.key} className={'chip chip-btn' + (d.key === draft.key ? ' on' : '')} onClick={() => { setDraftKey(d.key); setShowSource(false); }}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <div className="draft">
                      <p className="subject"><span className="lbl">Subject</span> <b>{showSource && draft.sourceSubject ? draft.sourceSubject : draft.subject}</b></p>
                      <p className="preview">Preview text: {showSource && draft.sourcePreview ? draft.sourcePreview : draft.preview}</p>
                      <hr />
                      <p className="body">{draft.body}</p>
                    </div>
                    <div className="btn-row">
                      <button className="btn">Regenerate</button>
                      {draft.lang === 'JP' && draft.sourceSubject && (
                        <button className="btn" aria-pressed={showSource} onClick={() => setShowSource((v) => !v)}>{showSource ? 'Show JP draft' : 'Show EN source'}</button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="muted small">Drafts are generated once the segments are set: one per segment and language, English as the source and Japanese via internal translation.</p>
                )}
              </section>
            </div>

            {/* 4 · Revenue approval */}
            <section className="panel">
              <header className="panel-head">
                <h2>4 · Revenue approval</h2>
                <span className="hint">Nothing sends until the reviewer approves. Every edit is logged and feeds the next list.</span>
              </header>
              {detail.review.length ? (
                <div className="table-wrap flat">
                  <table>
                    <thead><tr><th>Contact</th><th>Account</th><th>Segment</th><th>Reviewer action</th><th>Reason</th></tr></thead>
                    <tbody>
                      {detail.review.map((r) => (
                        <tr key={r.contact}>
                          <td className="strong">{r.contact}</td>
                          <td>{r.account}</td>
                          <td>{r.segment}</td>
                          <td><span className={`pill ${ACTION_TONE[r.action]}`}>{r.action}</span></td>
                          <td className="muted-2">{r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted small">{detail.reviewFooter}</p>
              )}
              <footer className="approve-row">
                <span className="muted-2">
                  {detail.review.length ? emphasiseMinutes(detail.reviewFooter) : null}
                  {approved && <span className="ok"> · Approved by {detail.reviewer}. Ready to send to Marketo as a draft.</span>}
                  {changesRequested && <span className="warn-txt"> · Changes requested; the owner has been notified.</span>}
                </span>
                {!detail.isNew && (
                  <div className="actions">
                    <button className="btn" disabled={!canApprove} onClick={requestChanges}>Request changes</button>
                    <button className="btn btn-green" disabled={!canApprove} onClick={approve}>{approved ? 'Approved' : 'Approve list and drafts'}</button>
                  </div>
                )}
              </footer>
            </section>
          </>
        )}
      </section>
    </AppShell>
  );
}

function draftTitleFor(detail: CampaignDetail, draft: Draft) {
  if (draft.key === detail.drafts[0]?.key && detail.draftTitle !== 'Draft') return detail.draftTitle;
  return `Draft · ${draft.label}`;
}

/** Bold the "22 min" in the approval footer, like the wireframe. */
function emphasiseMinutes(text: string) {
  const m = text.match(/(\d+ min)/);
  if (!m || m.index == null) return text;
  return <>{text.slice(0, m.index)}<b>{m[1]}</b>{text.slice(m.index + m[1].length)}</>;
}
