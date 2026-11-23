import { prisma } from "@/lib/prisma";

/** Rows shown per table page. The tables are large now, so the browser pages them. */
export const PAGE_SIZE = 100;

/**
 * The mock tables exposed by the data browser, keyed by URL slug.
 * `list(page)` returns one page of rows for /tables/<slug>; `count` the total.
 */
export const TABLES = {
  accounts: {
    label: "Account",
    hint: "Publishers, demand partners, agencies",
    count: () => prisma.account.count(),
    list: (skip: number) => prisma.account.findMany({ orderBy: { revenueRank: "asc" }, skip, take: PAGE_SIZE }),
  },
  contacts: {
    label: "Contact",
    hint: "People at accounts, incl. suspected duplicates",
    count: () => prisma.contact.count(),
    list: (skip: number) =>
      prisma.contact.findMany({
        orderBy: [{ account: { name: "asc" } }, { lastName: "asc" }],
        include: { account: { select: { name: true } } },
        skip,
        take: PAGE_SIZE,
      }),
  },
  leads: {
    label: "Lead",
    hint: "Unconverted prospects",
    count: () => prisma.lead.count(),
    list: (skip: number) => prisma.lead.findMany({ orderBy: { createdAt: "desc" }, skip, take: PAGE_SIZE }),
  },
  products: {
    label: "Magnite Product",
    hint: "SpringServe, DV+, ClearLine, Link, Streaming, Curation",
    count: () => prisma.magniteProduct.count(),
    list: (skip: number) => prisma.magniteProduct.findMany({ orderBy: { name: "asc" }, skip, take: PAGE_SIZE }),
  },
  opportunities: {
    label: "Opportunity",
    hint: "Pipeline by stage, with renewal risk",
    count: () => prisma.opportunity.count(),
    list: (skip: number) =>
      prisma.opportunity.findMany({
        orderBy: { closeDate: "asc" },
        include: { account: { select: { name: true } }, product: { select: { name: true } } },
        skip,
        take: PAGE_SIZE,
      }),
  },
  contracts: {
    label: "Magnite Contract",
    hint: "Signed terms per account and product",
    count: () => prisma.magniteContract.count(),
    list: (skip: number) =>
      prisma.magniteContract.findMany({
        orderBy: { startDate: "desc" },
        include: { account: { select: { name: true } }, product: { select: { name: true } } },
        skip,
        take: PAGE_SIZE,
      }),
  },
  cases: {
    label: "Case",
    hint: "Support emails routed to queues",
    count: () => prisma.case.count(),
    list: (skip: number) =>
      prisma.case.findMany({
        orderBy: { receivedAt: "desc" },
        include: { account: { select: { name: true } } },
        skip,
        take: PAGE_SIZE,
      }),
  },
} as const;

export type TableSlug = keyof typeof TABLES;

export function isTableSlug(s: string): s is TableSlug {
  return s in TABLES;
}
