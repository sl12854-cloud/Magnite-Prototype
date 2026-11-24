// Data behind B2, the campaign builder. One hand-written record reproduces the
// wireframe exactly (link-upsell-nov); every other campaign in CAMPAIGNS gets a
// derived record so no row link 404s. There is no Campaign table yet.
import { CAMPAIGNS, REGION_NAMES, type Campaign, type CampaignStatus } from './campaigns';

export type StepState = 'done' | 'review' | 'active' | 'todo';
export type Step = { n: number; title: string; summary: string; state: StepState };

export type FilterChip = { label: string; required?: boolean };
export type Segment = { name: string; rule: string; contacts: number; template: string };
export type Draft = { key: string; label: string; lang: 'EN' | 'JP'; subject: string; preview: string; body: string; sourceSubject?: string; sourcePreview?: string };
export type ReviewAction = 'Removed' | 'Changed' | 'Kept';
export type ReviewRow = { contact: string; account: string; segment: string; action: ReviewAction; reason: string };

export type CampaignDetail = {
  id: string;
  name: string;
  status: CampaignStatus | 'Draft';
  createdBy: string;
  reviewer: string;
  plannedSend: string; // "Nov 20, 2026" or "Not scheduled"
  steps: Step[];
  audience: {
    query: string;
    chips: FilterChip[];
    matches: number;
    excludedNoConsent: number;
    excludedNoCountry: number;
    duplicates: number;
  };
  segments: Segment[];
  segmentNote: string;
  drafts: Draft[];
  draftTitle: string; // "Draft · Japan segment (JP)"
  draftHint: string; // "EN source → JP via internal translation"
  review: ReviewRow[];
  reviewFooter: string;
  isNew?: boolean;
};

const REQUIRED: FilterChip[] = [
  { label: 'Consent = opted in (required)', required: true },
  { label: 'Country present (required)', required: true },
];

const LONG_DATE = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/** The campaign on wireframe B2, verbatim. */
const LINK_UPSELL: CampaignDetail = {
  id: 'link-upsell-nov',
  name: 'Magnite Link upsell · Nov',
  status: 'Awaiting approval',
  createdBy: 'Melissa Hillard',
  reviewer: 'Zach Pucci (revenue)',
  plannedSend: 'Nov 20, 2026',
  steps: [
    { n: 1, title: 'Audience', summary: 'Done · 1,240 contacts', state: 'done' },
    { n: 2, title: 'Segments', summary: 'Done · 3 segments', state: 'done' },
    { n: 3, title: 'Drafts', summary: 'Done · EN ×2, JP ×1', state: 'done' },
    { n: 4, title: 'Revenue approval', summary: 'In review · 18 edits so far', state: 'review' },
  ],
  audience: {
    query: 'Publishers not using Magnite Link, active in Streaming in the last 90 days, exclude anyone contacted in the last 14 days',
    chips: [
      { label: 'Account type = Publisher' },
      { label: 'Magnite Link active = false' },
      { label: 'Streaming last active ≤ 90 days' },
      { label: 'Last contacted > 14 days' },
      ...REQUIRED,
    ],
    matches: 1240,
    excludedNoConsent: 163,
    excludedNoCountry: 41,
    duplicates: 27,
  },
  segments: [
    { name: 'North America', rule: 'Country in US, CA · sales-house publishers', contacts: 612, template: 'EN · Link upsell' },
    { name: 'EMEA', rule: 'Country in EU, UK · SDK mediation + sales house', contacts: 389, template: 'EN · Link upsell' },
    { name: 'Japan', rule: 'Country = JP', contacts: 239, template: 'JP · Link upsell' },
  ],
  segmentNote: 'Premium publishers (top 40 by revenue) are pulled out automatically and handed to account owners for 1:1 outreach.',
  draftTitle: 'Draft · Japan segment (JP)',
  draftHint: 'EN source → JP via internal translation',
  drafts: [
    {
      key: 'jp',
      label: 'JP',
      lang: 'JP',
      subject: 'Magnite Linkで配信を一元化しませんか',
      preview: 'Streamingで配信中のパブリッシャー様へ、Magnite Linkのご案内',
      body: '[Draft body: three short paragraphs, generated from the EN source and the segment’s product-use fields. The reviewer edits in place; edits are kept per segment.]',
      sourceSubject: 'Bring your Streaming demand together with Magnite Link',
      sourcePreview: 'For publishers already live on Streaming: what Magnite Link adds',
    },
    {
      key: 'en-na',
      label: 'EN · North America',
      lang: 'EN',
      subject: 'Bring your Streaming demand together with Magnite Link',
      preview: 'For sales-house publishers already live on Streaming: what Magnite Link adds',
      body: '[Draft body: three short paragraphs for North American sales-house publishers, generated from the segment’s product-use fields. The reviewer edits in place; edits are kept per segment.]',
    },
    {
      key: 'en-emea',
      label: 'EN · EMEA',
      lang: 'EN',
      subject: 'One connection for Streaming and SDK demand: Magnite Link',
      preview: 'For EMEA publishers on SDK mediation and sales house: what Magnite Link adds',
      body: '[Draft body: three short paragraphs for EMEA publishers on SDK mediation, generated from the segment’s product-use fields. The reviewer edits in place; edits are kept per segment.]',
    },
  ],
  review: [
    { contact: 'Hana Sato', account: 'Meridian Plus KK', segment: 'Japan', action: 'Removed', reason: 'Already in a renewal conversation' },
    { contact: 'R. Alvarez', account: 'Northwind Media', segment: 'North America', action: 'Removed', reason: 'Premium publisher, 1:1 outreach' },
    { contact: 'Dana Whitfield', account: 'Orchard TV', segment: 'North America', action: 'Changed', reason: 'Wrong contact; swapped to ad ops lead' },
    { contact: 'L. Fischer', account: 'Kestrel Games', segment: 'EMEA', action: 'Kept', reason: 'Reviewer confirmed' },
    { contact: 'Priya Nair', account: 'Sundial Apps', segment: 'EMEA', action: 'Removed', reason: 'Contract in termination' },
  ],
  reviewFooter: '18 of 1,240 contacts edited (1.5%) · last campaign 4.2% · vetting time so far 22 min vs. ~4 hours by hand',
};

const REVIEWERS: Record<string, string> = { default: 'Zach Pucci (revenue)' };
const SAMPLE_PEOPLE = [
  ['Hana Sato', 'Meridian Plus KK'],
  ['R. Alvarez', 'Northwind Media'],
  ['Dana Whitfield', 'Orchard TV'],
  ['L. Fischer', 'Kestrel Games'],
  ['Priya Nair', 'Sundial Apps'],
  ['O. Chen', 'Pacific Reach Media'],
  ['A. Roux', 'Cobalt Agency Group'],
] as const;
const REASONS: Record<ReviewAction, string[]> = {
  Removed: ['Already in a renewal conversation', 'Premium publisher, 1:1 outreach', 'Contract in termination', 'Left the company'],
  Changed: ['Wrong contact; swapped to ad ops lead', 'Swapped to the billing contact'],
  Kept: ['Reviewer confirmed'],
};

/** Plain-language query -> the filter chips the AI would show. Keyword based; good enough for sample rows. */
function chipsFor(query: string): FilterChip[] {
  const q = query.toLowerCase();
  const out: FilterChip[] = [];
  if (/publisher/.test(q)) out.push({ label: 'Account type = Publisher' });
  if (/buyer|demand|dsp/.test(q)) out.push({ label: 'Account type = Demand' });
  if (/springserve/.test(q)) out.push({ label: 'Product = SpringServe' });
  if (/clearline/.test(q)) out.push({ label: 'Product = ClearLine' });
  if (/dv\+/.test(q)) out.push({ label: 'Product = DV+' });
  if (/streaming|ssai/.test(q)) out.push({ label: 'Product = Streaming' });
  if (/ctv/.test(q)) out.push({ label: 'Product = CTV' });
  if (/magnite link/.test(q)) out.push({ label: 'Magnite Link active = false' });
  const days = q.match(/last (\d+) days/);
  if (days) out.push({ label: /logged in|opened/.test(q) ? `Last active ≤ ${days[1]} days` : `Active ≤ ${days[1]} days` });
  if (/since oct 1/.test(q)) out.push({ label: 'Signed ≥ Oct 1' });
  if (/japan|jp\b/.test(q)) out.push({ label: 'Country = JP' });
  if (/\bna\b|north america/.test(q)) out.push({ label: 'Region = NA' });
  if (/active deal/.test(q)) out.push({ label: 'Active deals ≥ 1' });
  if (/top 40/.test(q)) out.push({ label: 'Revenue rank ≤ 40' });
  if (/primary contact/.test(q)) out.push({ label: 'Primary contact = true' });
  return [...out, ...REQUIRED];
}

/** A plausible builder state for any campaign in the list. Deterministic from the row itself. */
function derive(c: Campaign): CampaignDetail {
  const isDraft = c.status === 'Draft';
  const regions = c.regions.length ? c.regions : ['ALL'];
  const total = c.contacts;
  const noConsent = Math.round(total * 0.13);
  const noCountry = Math.round(total * 0.033);
  const dupes = Math.round(total * 0.022);
  const templateName = c.name.split(/[:·]/)[0].trim();

  // Split contacts across regions roughly 50/30/20 with the remainder on the first.
  const weights = regions.map((_, i) => [0.5, 0.31, 0.19, 0.1][i] ?? 0.1);
  const wsum = weights.reduce((a, b) => a + b, 0);
  const counts = regions.map((_, i) => Math.round((total * weights[i]) / wsum));
  counts[0] += total - counts.reduce((a, b) => a + b, 0);

  const segments: Segment[] = regions.map((r, i) => ({
    name: r === 'ALL' ? 'Single list' : REGION_NAMES[r],
    rule: r === 'NA' ? 'Country in US, CA' : r === 'EMEA' ? 'Country in EU, UK' : r === 'APAC' ? 'Country in AU, SG, KR, IN' : r === 'JP' ? 'Country = JP' : 'Everyone who matches',
    contacts: counts[i],
    template: `${r === 'JP' ? 'JP' : 'EN'} · ${templateName}`,
  }));

  const drafts: Draft[] = regions.map((r) => {
    const lang: 'EN' | 'JP' = r === 'JP' ? 'JP' : 'EN';
    const label = r === 'ALL' ? 'EN' : `${lang} · ${REGION_NAMES[r]}`;
    return {
      key: r.toLowerCase(),
      label,
      lang,
      subject: lang === 'JP' ? `${templateName}のご案内` : `${c.name.replace(/\s*\(JP\)$/, '')}: what changes for you`,
      preview: lang === 'JP' ? `${templateName}に関する最新情報` : `A short note for ${r === 'ALL' ? 'your team' : REGION_NAMES[r] + ' clients'} about ${templateName.toLowerCase()}`,
      body: isDraft
        ? '[No draft yet. Drafts are generated once the audience and segments are set.]'
        : `[Draft body: three short paragraphs for the ${r === 'ALL' ? 'whole list' : REGION_NAMES[r] + ' segment'}, generated from the segment’s product-use fields. The reviewer edits in place; edits are kept per segment.]`,
      sourceSubject: lang === 'JP' ? `${c.name.replace(/\s*\(JP\)$/, '')}: what changes for you` : undefined,
      sourcePreview: lang === 'JP' ? `A short note for Japan clients about ${templateName.toLowerCase()}` : undefined,
    };
  });

  const edits = c.edits;
  const actions: ReviewAction[] = ['Removed', 'Removed', 'Changed', 'Kept', 'Removed'];
  const review: ReviewRow[] = edits
    ? SAMPLE_PEOPLE.slice(0, Math.min(5, Math.max(2, Math.ceil(edits / 10)))).map(([contact, account], i) => {
        const action = actions[i % actions.length];
        return { contact, account, segment: segments[i % segments.length].name, action, reason: REASONS[action][i % REASONS[action].length] };
      })
    : [];

  const pct = total ? ((edits / total) * 100).toFixed(1) : '0.0';
  const stepFour: Step = isDraft
    ? { n: 4, title: 'Revenue approval', summary: 'Not started', state: 'todo' }
    : c.status === 'Awaiting approval'
      ? { n: 4, title: 'Revenue approval', summary: `In review · ${edits} edits so far`, state: 'review' }
      : { n: 4, title: 'Revenue approval', summary: `${c.status === 'Handed off' ? 'Handed off' : 'Approved'} · ${edits} edits`, state: 'done' };

  const enCount = drafts.filter((d) => d.lang === 'EN').length;
  const jpCount = drafts.length - enCount;
  const first = drafts.find((d) => d.lang === 'JP') ?? drafts[0];

  return {
    id: c.id,
    name: c.name,
    status: c.status,
    createdBy: c.owner,
    reviewer: REVIEWERS.default,
    plannedSend: isDraft ? `Target ${LONG_DATE(c.send)}` : LONG_DATE(c.send),
    steps: [
      isDraft && total === 0
        ? { n: 1, title: 'Audience', summary: 'In progress · describe the audience', state: 'active' }
        : { n: 1, title: 'Audience', summary: `Done · ${total.toLocaleString('en-US')} contacts`, state: 'done' },
      isDraft ? { n: 2, title: 'Segments', summary: 'Not started', state: 'todo' } : { n: 2, title: 'Segments', summary: `Done · ${segments.length} segment${segments.length === 1 ? '' : 's'}`, state: 'done' },
      isDraft ? { n: 3, title: 'Drafts', summary: 'Not started', state: 'todo' } : { n: 3, title: 'Drafts', summary: `Done · EN ×${enCount}${jpCount ? `, JP ×${jpCount}` : ''}`, state: 'done' },
      stepFour,
    ],
    audience: {
      query: c.query,
      chips: chipsFor(c.query),
      matches: total,
      excludedNoConsent: noConsent,
      excludedNoCountry: noCountry,
      duplicates: dupes,
    },
    segments: isDraft ? [] : segments,
    segmentNote: 'Premium publishers (top 40 by revenue) are pulled out automatically and handed to account owners for 1:1 outreach.',
    draftTitle: first ? `Draft · ${first.label.replace(/^EN · |^JP$/, (m) => (m === 'JP' ? 'Japan segment (JP)' : ''))}${first.lang === 'EN' && first.label !== 'EN' ? ' segment (EN)' : first.label === 'EN' ? 'Single list (EN)' : ''}` : 'Draft',
    draftHint: jpCount ? 'EN source → JP via internal translation' : 'EN source · edits kept per segment',
    drafts: isDraft ? [] : drafts,
    review,
    reviewFooter: total
      ? `${edits} of ${total.toLocaleString('en-US')} contacts edited (${pct}%) · vetting time so far ${Math.max(5, Math.round(edits * 1.2))} min vs. ~4 hours by hand`
      : 'No list built yet. Edits are logged once the reviewer starts.',
  };
}

/** Empty builder for /campaigns/new. `audience` pre-fills the query box when B1 hands one over. */
export function newCampaignDetail(audience = ''): CampaignDetail {
  return {
    id: 'new',
    name: 'New campaign',
    status: 'Draft',
    createdBy: 'Melissa Hillard',
    reviewer: 'Zach Pucci (revenue)',
    plannedSend: 'Not scheduled',
    steps: [
      { n: 1, title: 'Audience', summary: audience ? 'In progress · ready to build' : 'In progress · describe the audience', state: 'active' },
      { n: 2, title: 'Segments', summary: 'Not started', state: 'todo' },
      { n: 3, title: 'Drafts', summary: 'Not started', state: 'todo' },
      { n: 4, title: 'Revenue approval', summary: 'Not started', state: 'todo' },
    ],
    audience: { query: audience, chips: [], matches: 0, excludedNoConsent: 0, excludedNoCountry: 0, duplicates: 0 },
    segments: [],
    segmentNote: 'Segments are proposed once the list is built. Premium publishers (top 40 by revenue) are pulled out automatically for 1:1 outreach.',
    draftTitle: 'Draft',
    draftHint: 'One draft per segment and language',
    drafts: [],
    review: [],
    reviewFooter: 'Nothing to review yet.',
    isNew: true,
  };
}

export function getCampaignDetail(id: string): CampaignDetail | null {
  if (id === LINK_UPSELL.id) return LINK_UPSELL;
  const c = CAMPAIGNS.find((x) => x.id === id);
  return c ? derive(c) : null;
}
