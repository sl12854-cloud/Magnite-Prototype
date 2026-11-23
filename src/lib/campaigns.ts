// Campaign list for B1. Campaigns are prototype data (no Prisma table yet);
// audience health and segment sizes on the page come from the Contact table.

export type CampaignStatus = 'Draft' | 'Awaiting approval' | 'Approved' | 'Sent' | 'Handed off';

export type Campaign = {
  id: string;
  name: string;
  query: string; // plain-language audience
  regions: string[]; // NA | EMEA | APAC | JP
  segmentLabel?: string; // overrides "NA / EMEA" display, e.g. "by region"
  contacts: number;
  edits: number; // contacts the revenue reviewer removed or changed
  opened: number | null; // %
  clicked: number | null; // %
  send: string; // YYYY-MM-DD
  status: CampaignStatus;
  owner: string;
};

export const CAMPAIGNS: Campaign[] = [
  { id: 'link-upsell-nov', name: 'Magnite Link upsell · Nov', query: 'Publishers not using Magnite Link, active in Streaming in the last 90 days', regions: ['NA', 'EMEA', 'JP'], contacts: 1240, edits: 18, opened: null, clicked: null, send: '2026-11-20', status: 'Awaiting approval', owner: 'Melissa Hillard' },
  { id: 'dsp-onboarding-q4', name: 'DSP onboarding: Q4 partners', query: 'Demand accounts signed since Oct 1 with a DV+ seat', regions: ['NA', 'EMEA'], contacts: 312, edits: 6, opened: null, clicked: null, send: '2026-11-26', status: 'Awaiting approval', owner: 'Melissa Hillard' },
  { id: 'springserve-fee', name: 'SpringServe fee change notice', query: 'All SpringServe seat admins', regions: ['NA', 'EMEA', 'APAC', 'JP'], segmentLabel: 'by region', contacts: 2860, edits: 41, opened: null, clicked: null, send: '2026-11-30', status: 'Approved', owner: 'Omar Haddad' },
  { id: 'curation-21', name: 'Product update: Curation 2.1', query: 'ClearLine buyers who logged in during the last 60 days', regions: ['NA', 'JP'], contacts: 1975, edits: 23, opened: 31, clicked: 9, send: '2026-11-05', status: 'Sent', owner: 'Grace Lin' },
  { id: 'ctv-webinar', name: 'CTV best practices webinar', query: 'CTV publishers with at least one active deal', regions: ['NA', 'EMEA', 'APAC'], contacts: 3410, edits: 87, opened: 24, clicked: 6, send: '2026-10-22', status: 'Sent', owner: 'Melissa Hillard' },
  { id: 'premium-1to1', name: 'Premium publishers: 1:1 outreach list', query: 'Top 40 publishers by revenue; handed to account owners, not sent', regions: [], contacts: 40, edits: 3, opened: null, clicked: null, send: '2026-10-15', status: 'Handed off', owner: 'Zach Pucci' },
  { id: 'holiday-inventory', name: 'Holiday inventory planning', query: 'Sales-house publishers in NA with Streaming inventory', regions: ['NA'], contacts: 1118, edits: 52, opened: 19, clicked: 4, send: '2026-10-08', status: 'Sent', owner: 'Grace Lin' },
  { id: 'japan-update', name: 'Japan market update (JP)', query: 'Japan-based clients who opened any email in the last 45 days', regions: ['JP'], contacts: 466, edits: 9, opened: 38, clicked: 12, send: '2026-09-24', status: 'Sent', owner: 'Aiko Tanaka' },
  { id: 'ssai-update', name: 'Streaming SSAI update', query: 'Publishers on SSAI integrations', regions: ['NA', 'EMEA'], contacts: 820, edits: 27, opened: 22, clicked: 5, send: '2026-09-10', status: 'Sent', owner: 'Omar Haddad' },
  { id: 'year-end', name: 'Year-end thank you', query: 'All active publisher and buyer primary contacts', regions: ['NA', 'EMEA', 'APAC', 'JP'], contacts: 0, edits: 0, opened: null, clicked: null, send: '2026-12-15', status: 'Draft', owner: 'Melissa Hillard' },
  { id: 'dooh-intro', name: 'DOOH intro for buyers', query: 'Buyers with CTV spend and no DOOH deals', regions: ['NA'], contacts: 0, edits: 0, opened: null, clicked: null, send: '2026-12-08', status: 'Draft', owner: 'Grace Lin' },
];

export const TEMPLATES = [
  { name: 'Link upsell', lang: 'EN', updated: '2026-11-17', used: 2 },
  { name: 'Link upsell', lang: 'JP', updated: '2026-11-17', used: 1 },
  { name: 'Product update', lang: 'EN', updated: '2026-10-30', used: 4 },
  { name: 'Product update', lang: 'JP', updated: '2026-10-30', used: 2 },
  { name: 'Policy / fee notice', lang: 'EN', updated: '2026-11-12', used: 1 },
  { name: 'Event invite', lang: 'EN', updated: '2026-10-01', used: 3 },
];

export const REGIONS = ['NA', 'EMEA', 'APAC', 'JP'] as const;
export const REGION_NAMES: Record<string, string> = { NA: 'North America', EMEA: 'EMEA', APAC: 'APAC', JP: 'Japan' };
