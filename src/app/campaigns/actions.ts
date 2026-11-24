'use server';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PREMIUM_RANK, type AudienceFilters, type AudienceResult } from '@/lib/audience';

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);

/**
 * Runs audience filters against the mock Salesforce Contact table.
 * Duplicates, missing consent and missing country are excluded (in that order) and counted.
 */
export async function runAudience(f: AudienceFilters): Promise<AudienceResult> {
  const account: Prisma.AccountWhereInput = { type: { not: 'Internal' } };
  if (f.accountTypes.length) account.type = { in: f.accountTypes };
  if (f.linkActive !== null) account.magniteLinkActive = f.linkActive;
  if (f.streamingWithinDays !== null) account.streamingLastActiveAt = { gte: daysAgo(f.streamingWithinDays) };
  if (f.regions.length) account.region = { in: f.regions };

  const where: Prisma.ContactWhereInput = { account };
  if (f.notContactedWithinDays !== null) {
    where.OR = [{ lastContactedAt: null }, { lastContactedAt: { lt: daysAgo(f.notContactedWithinDays) } }];
  }

  const rows = await prisma.contact.findMany({
    where,
    include: { account: { select: { name: true, region: true, revenueRank: true } } },
    orderBy: [{ account: { region: 'asc' } }, { account: { name: 'asc' } }, { lastName: 'asc' }],
  });

  const result: AudienceResult = { matches: [], excludedNoConsent: 0, excludedNoCountry: 0, duplicates: 0 };
  for (const c of rows) {
    if (c.duplicateOfId) { result.duplicates++; continue; }
    if (!c.consentOptIn) { result.excludedNoConsent++; continue; }
    if (!c.country) { result.excludedNoCountry++; continue; }
    result.matches.push({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      title: c.title,
      account: c.account.name,
      region: c.account.region,
      country: c.country,
      revenueRank: c.account.revenueRank,
      premium: c.account.revenueRank != null && c.account.revenueRank <= PREMIUM_RANK,
    });
  }
  return result;
}
