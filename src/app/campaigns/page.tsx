import { prisma } from '@/lib/prisma';
import { CAMPAIGNS, TEMPLATES } from '@/lib/campaigns';
import { CampaignsView, type AudienceHealth, type ViewKey } from './CampaignsView';

export const dynamic = 'force-dynamic';

const VIEWS: ViewKey[] = ['campaigns', 'drafts', 'segments', 'templates', 'approvals'];

/** Sidebar "Audience" block and per-region eligibility, read live from the Contact table. */
async function audienceHealth(): Promise<AudienceHealth> {
  const [total, duplicates, eligible] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.count({ where: { duplicateOfId: { not: null } } }),
    prisma.contact.findMany({
      where: { consentOptIn: true, country: { not: null }, duplicateOfId: null },
      select: { account: { select: { region: true } } },
    }),
  ]);
  const eligibleByRegion: Record<string, number> = {};
  for (const c of eligible) eligibleByRegion[c.account.region] = (eligibleByRegion[c.account.region] ?? 0) + 1;
  return {
    total,
    eligiblePct: total ? Math.round((eligible.length / total) * 100) : 0,
    duplicates,
    eligibleByRegion,
  };
}

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const sp = await searchParams;
  const view = VIEWS.includes(sp.view as ViewKey) ? (sp.view as ViewKey) : 'campaigns';
  const health = await audienceHealth();
  return <CampaignsView campaigns={CAMPAIGNS} templates={TEMPLATES} health={health} initialView={view} initialQuery={sp.q ?? ''} />;
}
