import { notFound } from 'next/navigation';
import { CAMPAIGNS, REVIEWER, SAMPLE_REVIEWS, type Campaign } from '@/lib/campaigns';
import { parseAudience } from '@/lib/audience';
import { runAudience } from '../actions';
import { Builder } from './Builder';

export const dynamic = 'force-dynamic';

export default async function CampaignBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ audience?: string }>;
}) {
  const { id } = await params;
  const { audience } = await searchParams;

  let campaign: Campaign | undefined;
  if (id === 'new') {
    const plannedSend = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    campaign = {
      id: 'new', name: 'Untitled campaign', query: audience ?? '', regions: [], contacts: 0, edits: 0,
      opened: null, clicked: null, send: plannedSend, status: 'Draft', owner: 'Melissa Hillard',
    };
  } else {
    const found = CAMPAIGNS.find((c) => c.id === id);
    campaign = found && { ...found, query: found.fullQuery ?? found.query };
  }
  if (!campaign) notFound();

  const initialResult = campaign.query.trim() ? await runAudience(parseAudience(campaign.query)) : null;

  return (
    <Builder
      campaign={campaign}
      reviewer={REVIEWER}
      sampleReviews={SAMPLE_REVIEWS[campaign.id] ?? {}}
      initialResult={initialResult}
    />
  );
}
