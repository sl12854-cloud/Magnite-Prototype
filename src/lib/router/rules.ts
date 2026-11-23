import { NEEDS_REVIEW, type Queue } from "./queues";

/**
 * Deterministic keyword rules. These are the fallback when the LLM is
 * unavailable, and they are also what the weekly correction review edits:
 * a correction does not retrain anything by itself (see A2's footnote), it
 * becomes a rule here.
 *
 * Each rule contributes `weight` to its queue's score when any pattern hits.
 * Scores are summed per queue, then turned into a 0-100 confidence by
 * `scoreToConfidence` below.
 */
type Rule = {
  queue: Queue;
  weight: number;
  patterns: RegExp[];
  note: string;
};

export const RULES: Rule[] = [
  {
    queue: "CTV Tech Ops",
    weight: 3,
    patterns: [/\bctv\b/i, /\bdeal id\b/i, /\bfill rate\b/i, /\bstreaming platform\b/i, /\bott\b/i],
    note: "CTV and streaming delivery terms",
  },
  {
    queue: "CTV Tech Ops",
    weight: 2,
    patterns: [/\bpod\b/i, /\bad break\b/i, /\bbitrate\b/i, /\bmanifest\b/i],
    note: "CTV playback terms",
  },
  {
    queue: "SpringServe Support",
    weight: 3,
    patterns: [/springserve/i, /\bvast\b/i, /\brouter\b/i, /\bpreroll\b/i, /\bad server\b/i],
    note: "SpringServe and ad-serving terms",
  },
  {
    queue: "SpringServe Support",
    weight: 2,
    patterns: [/\bvast \d{3}\b/i, /\bvpaid\b/i, /\btag (update|error)\b/i],
    note: "Ad tag error codes",
  },
  {
    queue: "DV+ Support",
    weight: 3,
    patterns: [/\bdv\+/i, /clearline/i, /\bseat\b/i, /trading desk/i],
    note: "DV+ and buyer platform terms",
  },
  {
    queue: "DV+ Support",
    weight: 2,
    patterns: [/\blog ?in\b/i, /\bpassword\b/i, /\baccess\b/i, /\bsso\b/i],
    note: "Platform access terms",
  },
  {
    queue: "Salesforce Ops",
    weight: 4,
    patterns: [/salesforce/i, /\bpicklist\b/i, /\bfield request\b/i, /\breport(ing)? request\b/i, /\bmandala\b/i],
    note: "Internal Salesforce administration",
  },
  {
    queue: "Billing & Finance",
    weight: 3,
    patterns: [/\binvoice\b/i, /\bbilling\b/i, /\bpayment\b/i, /\bremittance\b/i, /\bcredit note\b/i, /\bw-?9\b/i],
    note: "Invoice and payment terms",
  },
  {
    queue: "Billing & Finance",
    weight: 2,
    patterns: [/\bfee\b/i, /\brev(enue)? share\b/i, /\bpayout\b/i, /\bap\b/i],
    note: "Commercial terms",
  },
  {
    queue: "Legal & Contracts",
    weight: 3,
    patterns: [/\bcontract\b/i, /\bmsa\b/i, /\bdpa\b/i, /\bredline/i, /\bnda\b/i, /\bamendment\b/i],
    note: "Contract and legal terms",
  },
  {
    queue: "Legal & Contracts",
    weight: 2,
    patterns: [/\bdata processing\b/i, /\bgdpr\b/i, /\bsignature\b/i, /\bcounsel\b/i],
    note: "Privacy and signature terms",
  },
  {
    queue: "Client Services",
    weight: 2,
    patterns: [/account manager/i, /\bwho (is|are)\b/i, /\bintroduc/i, /\bcheck ?in\b/i, /\bqbr\b/i],
    note: "Relationship and account questions",
  },
];

export type RuleResult = {
  queue: Queue;
  confidence: number;
  reason: string;
  /** Every queue that scored, best first. Used to spot genuine ambiguity. */
  scores: { queue: Queue; score: number }[];
};

/**
 * Turn a summed rule score into a 0-100 confidence.
 *
 * Deliberately conservative: rules alone top out at 88 so that a rules-only
 * route never outranks a confident LLM call, and a case where two queues tie
 * is pulled down hard, because that is exactly the "mentioned both an invoice
 * and a contract" case A2 calls out.
 */
function scoreToConfidence(top: number, runnerUp: number): number {
  if (top === 0) return 0;
  const base = Math.min(88, 55 + top * 7);
  const margin = top - runnerUp;
  const penalty = margin <= 0 ? 30 : margin === 1 ? 10 : margin === 2 ? 4 : 0;
  return Math.max(0, Math.round(base - penalty));
}

export function classifyWithRules(input: { subject: string; body?: string | null }): RuleResult {
  const text = `${input.subject}\n${input.body ?? ""}`;
  const totals = new Map<Queue, { score: number; notes: string[] }>();

  for (const rule of RULES) {
    // Several distinct patterns from one rule hitting is real corroboration,
    // not repetition: "CTV" plus "fill rate" is a stronger signal than either
    // alone. Capped at two so a keyword-stuffed email cannot run away with it.
    const hits = rule.patterns.filter((p) => p.test(text)).length;
    if (hits === 0) continue;
    const entry = totals.get(rule.queue) ?? { score: 0, notes: [] };
    entry.score += rule.weight * Math.min(hits, 2);
    entry.notes.push(rule.note);
    totals.set(rule.queue, entry);
  }

  const scores = [...totals.entries()]
    .map(([queue, v]) => ({ queue, score: v.score }))
    .sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    return {
      queue: NEEDS_REVIEW,
      confidence: 0,
      reason: "No routing rule matched the subject or body.",
      scores,
    };
  }

  const [best, second] = scores;
  const confidence = scoreToConfidence(best.score, second?.score ?? 0);
  const notes = totals.get(best.queue)!.notes.join("; ");
  const reason =
    second && second.score >= best.score
      ? `Ambiguous: ${best.queue} and ${second.queue} scored equally (${notes}).`
      : `Matched ${notes}.`;

  return { queue: best.queue, confidence, reason, scores };
}
