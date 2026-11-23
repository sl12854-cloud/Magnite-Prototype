/**
 * Turning an inbound email into a case (MAG-14).
 *
 * Magnite's single support@ inbox is the only entry point: every email becomes
 * a case here and nothing reaches Salesforce until the case closes. That is
 * the line in A1's footer, and it is the reason this adapter exists rather
 * than a direct Salesforce write.
 *
 * The adapter is deliberately transport-agnostic. Whatever eventually feeds it
 * - an IMAP poller, an SES webhook, a Marketo forward - only has to produce an
 * `InboundEmail`. The prototype feeds it from the API and from fixtures.
 */
import { classifyCase } from "../router/classify";
import { UNROUTED } from "../router/queues";

export type InboundEmail = {
  messageId: string;
  from: string;
  subject: string;
  body?: string | null;
  receivedAt?: Date;
  /** Total size of the raw message and attachments, in bytes. */
  sizeBytes?: number;
};

export type PreparedCase = {
  caseNumber: string;
  subject: string;
  description: string | null;
  fromEmail: string;
  queue: string;
  initialQueue: string;
  confidence: number;
  intent: string | null;
  routingMode: "ai" | "rules";
  routingReason: string;
  attachmentBytes: number;
  status: string;
  receivedAt: Date;
  routedAt: Date;
};

/** `"Marcus Hale <adops@bluepeak.tv>"` -> `"adops@bluepeak.tv"`. */
export function parseAddress(from: string): string {
  const angled = from.match(/<([^>]+)>/);
  return (angled ? angled[1] : from).trim().toLowerCase();
}

/**
 * Strips the quoted history off a reply so the router classifies what the
 * sender actually wrote. Without this, a one-line "any update?" inherits the
 * keywords of the whole thread and routes on stale signal.
 */
export function stripQuotedReply(body: string): string {
  const markers = [
    /^\s*On .+ wrote:\s*$/m,
    /^\s*-{2,}\s*Original Message\s*-{2,}\s*$/im,
    /^\s*_{10,}\s*$/m,
    /^\s*From:\s.+$/m,
  ];
  let cut = body.length;
  for (const m of markers) {
    const hit = body.match(m);
    if (hit?.index != null) cut = Math.min(cut, hit.index);
  }
  return body.slice(0, cut).trim();
}

/** `Re: Fwd: RE: Deal ID issue` -> `Deal ID issue` */
export function normaliseSubject(subject: string): string {
  return subject.replace(/^(\s*(re|fwd|fw)\s*:\s*)+/i, "").trim();
}

let counter = 0;
/** Case numbers are sequential per run; the real one comes from Salesforce. */
export function nextCaseNumber(seed = Date.now()): string {
  counter += 1;
  return `C-${String(seed).slice(-5)}${String(counter).padStart(2, "0")}`;
}

/**
 * Classify an email and return the row to write. Does not touch the database,
 * so it is testable on its own and reusable by a bulk importer.
 */
export async function prepareCase(
  email: InboundEmail,
  opts: { threshold?: number } = {},
): Promise<PreparedCase> {
  const receivedAt = email.receivedAt ?? new Date();
  const subject = normaliseSubject(email.subject);
  const body = email.body ? stripQuotedReply(email.body) : null;

  const result = await classifyCase(
    { subject, body, fromEmail: parseAddress(email.from) },
    { threshold: opts.threshold },
  );

  return {
    caseNumber: nextCaseNumber(),
    subject,
    description: body,
    fromEmail: parseAddress(email.from),
    queue: result.queue,
    initialQueue: result.queue,
    confidence: result.confidence,
    intent: result.intent,
    routingMode: result.mode,
    routingReason: result.reason,
    attachmentBytes: email.sizeBytes ?? Buffer.byteLength(email.body ?? "", "utf8"),
    status: result.queue === "Needs review" ? "Needs review" : "New",
    receivedAt,
    routedAt: new Date(receivedAt.getTime() + 1000),
  };
}

/** A case that arrived but has not been routed yet, for the support@ view. */
export function unroutedCase(email: InboundEmail): Partial<PreparedCase> {
  return {
    caseNumber: nextCaseNumber(),
    subject: normaliseSubject(email.subject),
    fromEmail: parseAddress(email.from),
    queue: UNROUTED,
    status: "New",
    receivedAt: email.receivedAt ?? new Date(),
  };
}
