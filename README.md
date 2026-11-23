# Magnite Prototype

Two AI-assisted prototypes for **Mandala**, Magnite's internal operations platform. Both sit on top of Salesforce data and share one shell: a left app rail, a queue or view sidebar, a global search bar, and a table-first work area.

Design source: [Magnite Prototype Wireframes canvas](https://claude.ai/artifact/Y7N2N6mfc4HmhEveEFsb7j). Static copies of every artboard live in [`wireframes/`](wireframes/).

## Prototype A · AI case routing

**Problem.** Every email to `support@magnite.com` lands in one inbox. Today a human reads each one and forwards it to the right team alias. First assignment takes about 47 minutes, and copying every email thread into Salesforce has pushed storage to 99% used.

**What we are building.** Every inbound email becomes a case. An AI model (Claude, the approved provider) classifies the intent, picks a queue, and attaches a confidence score. Cases above a threshold (70% by default) are routed automatically. Cases below it, or with mixed intent, land in a **Needs review** queue for a human. Nothing is written to Salesforce until a case closes.

**Queues.** support@ inbox (unrouted), CTV Tech Ops, SpringServe Support, DV+ Support, Salesforce Ops, Billing & Finance, Legal & Contracts, Client Services, Needs review.

**Screens.**

| Screen | File | What it shows |
| --- | --- | --- |
| A1 · Case queue | `wireframes/canvas-source/Main.dc.html` | Case table with subject, detected intent, sender and account, routed queue, confidence pill, status, owner, received time. Filters by queue, status, confidence, date. Primary action: "Route inbox with AI · 6 waiting". Fallback: "Route with rules only". |
| A2 · Routing performance | `wireframes/canvas-source/RoutingPerformance.dc.html` | KPI tiles (routing accuracy, auto-routed share, time to first assignment, data kept out of Salesforce), cases per day split auto vs review, share of cases by queue, accuracy by queue, recent human corrections. |

**Success metrics used in the wireframes.** Routing accuracy 91%, auto-routed 86%, time to first assignment 11 minutes (down from 47), 2.1 GB of email kept out of Salesforce per period.

**Key rules.**
- Confidence pills: green at 85% and above, amber 70 to 84%, red below 70%.
- A moved case does not retrain anything by itself. Corrections are reviewed weekly and folded into the routing rules.

## Prototype B · Client-comms campaign builder

**Problem.** Building a client email campaign means hand-pulling a Salesforce list, de-duplicating it, splitting by region, drafting copy per segment and language, and then having a revenue reviewer vet every contact. Vetting alone takes about four hours.

**What we are building.** A four-step builder where the user describes the audience in plain language. The AI turns that into visible, editable Salesforce filters, enforces consent and country requirements, splits the list into regional segments, drafts copy per segment (English source, Japanese via internal translation), and routes everything to a revenue reviewer. Approved campaigns go to Marketo as drafts. Nothing sends without approval.

**Builder steps.**
1. **Audience.** Plain-language query becomes filter chips. Consent and country are always required. Shows matches, exclusions, and flagged duplicates.
2. **Segments.** Rule, contact count and template per region. Top 40 premium publishers are pulled out automatically for 1:1 outreach by account owners.
3. **Drafts.** One draft per segment and language. Reviewer edits in place; edits are kept per segment. Regenerate or show the EN source.
4. **Revenue approval.** Every reviewer action (Removed, Changed, Kept) is logged with a reason. Edits feed the next list build.

**Screens.**

| Screen | File | What it shows |
| --- | --- | --- |
| B1 · Campaigns | `wireframes/canvas-source/Campaigns.dc.html` | Campaign list with plain-language audience, segment count, contacts, edits by revenue, open and click rates, send date, status. Sidebar shows audience health: contacts in sync, share with consent and country, duplicates to merge. |
| B2 · Campaign builder | `wireframes/canvas-source/CampaignDetail.dc.html` | The four-step builder for one campaign, with the approval table and "Approve list and drafts" action. |

**Success metric.** "Edits by revenue" per campaign. Lower is better. The sample campaign shows 1.5% of contacts edited vs 4.2% on the previous one, and 22 minutes of vetting vs about 4 hours by hand.

## Shared UI conventions

- Font: DM Sans for UI, STIX Two Text for page titles.
- Accent `#3348F0`. Status pills: blue for new or approved, amber for in progress or awaiting approval, green for closed or sent, red for needs review.
- Layout: 64px app rail, 232px sidebar, fluid main column at 1440px wide. Tables scroll horizontally below 1040px.
- Real `<button>`, `<a>`, `<input>` and `<label>` elements throughout, with `aria-label` on icon-only controls.

## Repository layout

```
README.md
wireframes/
  README.md              screen-by-screen notes and open questions
  canvas-source/         exact artboard sources exported from the design canvas
```

## Status

Wireframes only. No application code yet. See [`wireframes/README.md`](wireframes/README.md) for the screen inventory and open questions before implementation starts.
