// Plain-language audience -> visible, editable Salesforce-style filters (B2 step 1).
// The prototype uses keyword rules; the real build swaps parseAudience for the model call
// but keeps the same AudienceFilters shape so the chips and the query stay the same.

export type AccountType = 'Publisher' | 'Demand' | 'Agency';

export type AudienceFilters = {
  accountTypes: AccountType[];
  linkActive: boolean | null; // null = any
  streamingWithinDays: number | null;
  notContactedWithinDays: number | null;
  regions: string[]; // NA | EMEA | APAC | JP, empty = all
};

export type Chip = { key: keyof AudienceFilters | 'consent' | 'country'; label: string; required?: boolean };

export const EMPTY_FILTERS: AudienceFilters = { accountTypes: [], linkActive: null, streamingWithinDays: null, notContactedWithinDays: null, regions: [] };

/** Top N publishers by revenue are pulled out for 1:1 outreach by their account owners. */
export const PREMIUM_RANK = 40;

export function parseAudience(text: string): AudienceFilters {
  const t = text.toLowerCase();
  const f: AudienceFilters = { ...EMPTY_FILTERS, accountTypes: [], regions: [] };

  if (/publisher/.test(t)) f.accountTypes.push('Publisher');
  if (/demand|dsp|buyer/.test(t)) f.accountTypes.push('Demand');
  if (/agenc/.test(t)) f.accountTypes.push('Agency');

  if (/(not using|without|no) magnite link/.test(t)) f.linkActive = false;
  else if (/(using|on|with) magnite link/.test(t)) f.linkActive = true;

  const streaming = t.match(/streaming[^,.;]*?last (\d+) days/);
  if (streaming) f.streamingWithinDays = Number(streaming[1]);
  else if (/streaming/.test(t)) f.streamingWithinDays = 365;

  const contacted = t.match(/(exclude|not|except)[^,.;]*contacted[^,.;]*last (\d+) days/);
  if (contacted) f.notContactedWithinDays = Number(contacted[2]);

  if (/japan|\bjp\b/.test(t)) f.regions.push('JP');
  if (/north america|\bna\b|\bus\b|canada/.test(t)) f.regions.push('NA');
  if (/emea|europe|\buk\b/.test(t)) f.regions.push('EMEA');
  if (/apac|australia|asia/.test(t)) f.regions.push('APAC');

  return f;
}

export function chipsFor(f: AudienceFilters): Chip[] {
  const chips: Chip[] = [];
  if (f.accountTypes.length) chips.push({ key: 'accountTypes', label: `Account type ${f.accountTypes.length > 1 ? 'in' : '='} ${f.accountTypes.join(', ')}` });
  if (f.linkActive !== null) chips.push({ key: 'linkActive', label: `Magnite Link active = ${f.linkActive}` });
  if (f.streamingWithinDays !== null) chips.push({ key: 'streamingWithinDays', label: `Streaming last active ≤ ${f.streamingWithinDays} days` });
  if (f.notContactedWithinDays !== null) chips.push({ key: 'notContactedWithinDays', label: `Last contacted > ${f.notContactedWithinDays} days` });
  if (f.regions.length) chips.push({ key: 'regions', label: `Region ${f.regions.length > 1 ? 'in' : '='} ${f.regions.join(', ')}` });
  chips.push({ key: 'consent', label: 'Consent = opted in (required)', required: true });
  chips.push({ key: 'country', label: 'Country present (required)', required: true });
  return chips;
}

export function removeFilter(f: AudienceFilters, key: Chip['key']): AudienceFilters {
  switch (key) {
    case 'accountTypes': return { ...f, accountTypes: [] };
    case 'regions': return { ...f, regions: [] };
    case 'linkActive': return { ...f, linkActive: null };
    case 'streamingWithinDays': return { ...f, streamingWithinDays: null };
    case 'notContactedWithinDays': return { ...f, notContactedWithinDays: null };
    default: return f; // required chips cannot be removed
  }
}

export const SEGMENT_RULE: Record<string, string> = {
  NA: 'Country in US, CA',
  EMEA: 'Country in EU, UK',
  APAC: 'Country in AU, SG, IN',
  JP: 'Country = JP',
};

export type AudienceContact = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  account: string;
  region: string;
  country: string;
  revenueRank: number | null;
  premium: boolean;
};

export type AudienceResult = {
  matches: AudienceContact[];
  excludedNoConsent: number;
  excludedNoCountry: number;
  duplicates: number;
};
