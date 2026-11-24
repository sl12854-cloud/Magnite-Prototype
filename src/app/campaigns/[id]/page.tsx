import { notFound } from 'next/navigation';
import { getCampaignDetail, newCampaignDetail } from '@/lib/campaignDetail';
import { CampaignBuilder } from '../CampaignBuilder';

export const dynamic = 'force-dynamic';

/**
 * B2 · Campaign builder. /campaigns/new is the empty builder; any id from the
 * B1 list opens that campaign. Data comes from src/lib/campaignDetail.ts until
 * there is a Campaign table.
 */
export default async function CampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ audience?: string }> }) {
  const { id } = await params;
  const { audience } = await searchParams;
  const detail = id === 'new' ? newCampaignDetail(audience ?? '') : getCampaignDetail(id);
  if (!detail) notFound();
  return <CampaignBuilder detail={detail} />;
}
