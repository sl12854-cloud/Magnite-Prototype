// Builder progress per campaign, kept in the viewer's browser until a Campaign table exists.
// B1 reads `status` from here so both screens agree after an approval.

import type { AudienceFilters } from './audience';
import type { Draft } from './drafts';

export type ReviewAction = 'Kept' | 'Removed' | 'Changed';
export type HistoryEntry = { at: string; who: string; what: string };

export type BuilderState = {
  name: string;
  send: string;
  status: string;
  query: string;
  filters: AudienceFilters;
  reviews: Record<string, { action: ReviewAction; reason: string }>; // by contact id
  drafts: Record<string, Draft & { variant: number; edited: boolean }>; // by region
  history: HistoryEntry[];
  reviewStartedAt: string | null;
};

const key = (id: string) => `mandala.campaign.${id}`;

export function loadState(id: string): BuilderState | null {
  try {
    const v = localStorage.getItem(key(id));
    return v ? (JSON.parse(v) as BuilderState) : null;
  } catch {
    return null;
  }
}

export function saveState(id: string, s: BuilderState) {
  try {
    localStorage.setItem(key(id), JSON.stringify(s));
  } catch {
    /* storage unavailable: state lives for this page view only */
  }
}

export function clearState(id: string) {
  try { localStorage.removeItem(key(id)); } catch { /* ignore */ }
}

/** Saved status overrides for the B1 list. */
export function loadStatuses(ids: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of ids) {
    const s = loadState(id);
    if (s?.status) out[id] = s.status;
  }
  return out;
}
