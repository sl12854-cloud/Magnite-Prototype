import { prisma } from "@/lib/prisma";

/**
 * The mock tables exposed by the data browser, keyed by URL slug.
 * `list` returns the rows shown on /tables/<slug>; `count` the tile number on /.
 */
export const TABLES = {
  accounts: {
    label: "Account",
    hint: "Publishers, demand partners, agencies",
    count: () => prisma.account.count(),
    list: () => prisma.account.findMany({ orderBy: { revenueRank: "asc" } }),
  },
  contacts: {
    label: "Contact",
    hint: "People at accounts, incl. one duplicate pair",
    count: () => prisma.contact.count(),
    list: () =>
      prisma.contact.findMany({
        orderBy: [{ account: { name: "asc" } }, { lastName: "asc" }],
        include: { account: { select: { name: true } } },
      }),
  },
  leads: {
    label: "Lead",
    hint: "Unconverted prospects",
    count: () => prisma.lead.count(),
    list: () => prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
  },
  products: {
    label: "Magnite Product",
    hint: "SpringServe, DV+, ClearLine, Link, Streaming, Curation",
    count: () => prisma.magniteProduct.count(),
    list: () => prisma.magniteProduct.findMany({ orderBy: { name: "asc" } }),
  },
  opportunities: {
    label: "Opportunity",
    hint: "Pipeline by stage, with renewal risk",
    count: () => prisma.opportunity.count(),
    list: () =>
      prisma.opportunity.findMany({
        orderBy: { closeDate: "asc" },
        include: { account: { select: { name: true } }, product: { select: { name: true } } },
      }),
  },
  contracts: {
    label: "Magnite Contract",
    hint: "Signed terms per account and product",
    count: () => prisma.magniteContract.count(),
    list: () =>
      prisma.magniteContract.findMany({
        orderBy: { startDate: "desc" },
        include: { account: { select: { name: true } }, product: { select: { name: true } } },
      }),
  },
  cases: {
    label: "Case",
    hint: "Support emails routed to queues",
    count: () => prisma.case.count(),
    list: () =>
      prisma.case.findMany({
        orderBy: { receivedAt: "desc" },
        include: { account: { select: { name: true } } },
      }),
  },
} as const;

export type TableSlug = keyof typeof TABLES;

export function isTableSlug(s: string): s is TableSlug {
  return s in TABLES;
}
