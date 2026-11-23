# Prototype A — Case Router

Screens A1 and A2, the case-router endpoints behind them, and the seed that
makes A2's numbers real.

## Running it

```bash
npm install
npm run db:reset     # schema + seed: 1,323 cases, 119 corrections
npm run dev
npm test             # 21 tests, no database needed
```

- `/cases` — A1, the case queue
- `/routing-performance` — A2, the dashboard
- `/` — Sewon's data browser, unchanged

## Endpoints

| Method | Path | Ticket |
| --- | --- | --- |
| `GET` | `/api/cases` | MAG-16 — filter by `queue`, `status`, `confidence` (high/medium/low), `q`, `since`, `limit`, `offset` |
| `POST` | `/api/cases` | MAG-14 — accepts one inbound email, routes it, stores the case |
| `GET` | `/api/cases/:id` | MAG-16 |
| `PATCH` | `/api/cases/:id` | MAG-16 — status, owner, queue. A queue change writes a correction |
| `GET` | `/api/metrics/routing` | MAG-17 — every figure on A2, `?from=&to=` |

## How the numbers are defined

These are the definitions worth arguing about in review, so they are stated
rather than buried:

- **Correctly routed** = never corrected. Accuracy is therefore driven by what
  humans had to fix, not by what the model says about its own confidence. A
  case corrected twice counts wrong once.
- **Auto-routed** = the router's *first* choice was a real queue. A case that
  went to Needs review and was then moved by a human is not auto-routed, even
  though it ends up in a real queue.
- **Time to first assignment** is measured from receipt, not from routing,
  because the 47-minute baseline it is compared against included time an email
  sat in a shared mailbox.
- Cases still unrouted in `support@` are excluded from both rates.

## Why the seed looks the way it does

MAG-17 says the metrics must reproduce A2 from seed data. So `prisma/volume.ts`
is built backwards from the wireframe and fills exact quotas rather than
sampling: 1,323 cases, 119 corrections, 91% accuracy, 86% auto-routed, 2.1 GB,
and the per-queue splits all come out by construction. The PRNG seed is fixed,
so reruns are identical and the tests can pin the figures.

`tests/metrics.test.ts` asserts every tile and chart against the wireframe. If
someone changes the queue plan without changing the design, that suite fails.

## Known gaps

- **The wireframe contradicts itself.** A2's corrections card says cases
  C-10228 and C-10224 were moved out of Needs review; A1 shows both still
  sitting in Needs review. A1 is treated as correct and the corrections card is
  generated from real rows. Worth a decision.
- **MAG-21 is answered provisionally**: global threshold with a per-queue
  override, unused. Billing (84%) and Legal (82%) are the candidates.
- The LLM is not wired in. `setRoutingModel()` takes MAG-9's adapter; until
  then the keyword rules carry the prototype and the fallback path is what runs.

## Boundaries with Prototype B

Prototype A owns:

```
src/app/cases/**            src/lib/router/**       prisma/volume.ts
src/app/routing-performance/**   src/lib/ingest/**  tests/**
src/app/api/cases/**        src/lib/metrics/**
src/app/api/metrics/**      docs/prototype-a.md
```

Shared files are touched as little as possible: `prisma/schema.prisma` only
gains fields on `Case` and the new `CaseCorrection` model; `prisma/seed.ts`
gains one import and one call. `globals.css`, `layout.tsx`, `src/app/page.tsx`
and `src/lib/prisma.ts` are untouched — both screens use CSS Modules so no
class names are shared with the B lane.

## If `prisma generate` fails behind a firewall

Prisma downloads its engine from `binaries.prisma.sh`. On a restricted network
that 403s. Either allowlist that host, or switch the generator to the bundled
WebAssembly engine, which needs no download:

```prisma
generator client {
  provider        = "prisma-client-js"
  engineType      = "client"
  previewFeatures = ["driverAdapters", "queryCompiler"]
}
```

with `npm i @prisma/adapter-better-sqlite3` and the adapter passed to
`new PrismaClient({ adapter })`. Not committed, because it would force the
change on everyone when only sandboxed environments need it.
