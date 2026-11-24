// Draft copy per segment (B2 step 3). English is the source; Japanese comes from internal
// translation. The prototype ships fixed variants; "Regenerate" cycles through them.

export type Draft = { subject: string; preview: string; body: string };

const LINK_EN: Draft[] = [
  {
    subject: 'Bring your Streaming audiences together with Magnite Link',
    preview: 'For Streaming publishers: one place to activate your first-party data',
    body: 'Hi {first},\n\nYou are already selling Streaming inventory through Magnite. Magnite Link lets you package your own audience data and offer it to buyers without moving it to another platform.\n\nPublishers using Link in the last quarter saw buyers pick up curated deals faster, with no change to your existing setup.\n\nIf useful, {owner} can walk your team through it in 20 minutes.',
  },
  {
    subject: 'Your first-party data, ready for buyers',
    preview: 'Magnite Link turns audience segments into deals you control',
    body: 'Hi {first},\n\nBuyers keep asking for addressable Streaming audiences. Magnite Link lets you turn the segments you already have into deals, on your terms.\n\nSetup uses your current Magnite integration, so there is nothing new to install.\n\nReply to this email and {owner} will set up a short session.',
  },
  {
    subject: 'A faster path to curated Streaming deals',
    preview: 'See how Magnite Link works with your current setup',
    body: 'Hi {first},\n\nMagnite Link connects your audience data to the buyers already bidding on your Streaming inventory.\n\nIt works alongside your current deals and reporting.\n\n{owner} is happy to share examples from publishers like yours.',
  },
];

const LINK_JP: Draft[] = [
  {
    subject: 'Magnite Linkで配信を一元化しませんか',
    preview: 'Streamingで配信中のパブリッシャー様へ、Magnite Linkのご案内',
    body: '{last}様\n\nいつもMagniteをご利用いただきありがとうございます。Magnite Linkを使うと、自社のオーディエンスデータを他のプラットフォームに移さずにバイヤーへ提供できます。\n\n現在の設定はそのままでご利用いただけます。\n\nご興味があれば、{owner}より20分ほどでご説明いたします。',
  },
  {
    subject: 'ファーストパーティデータをバイヤーへ',
    preview: 'Magnite Linkでオーディエンスを取引に変える方法',
    body: '{last}様\n\nバイヤーからアドレサブルなStreamingオーディエンスへの要望が増えています。Magnite Linkなら、既存のセグメントをそのまま取引にできます。\n\n追加のインストールは不要です。\n\nこのメールにご返信いただければ、{owner}よりご連絡いたします。',
  },
];

function generic(name: string, lang: 'EN' | 'JP', i: number): Draft {
  const topic = name.replace(/\s*[·:(].*$/, '');
  if (lang === 'JP') {
    const v = [
      { subject: `${topic}のお知らせ`, preview: 'Magniteより最新情報をお届けします' },
      { subject: `【Magnite】${topic}について`, preview: 'お客様に関係する変更点のご案内' },
    ][i % 2];
    return { ...v, body: `{last}様\n\n${topic}についてご案内いたします。\n\n[本文: ENソースから社内翻訳で作成]\n\nご不明な点は{owner}までお問い合わせください。` };
  }
  const v = [
    { subject: topic, preview: `What ${topic.toLowerCase()} means for your team` },
    { subject: `Update from Magnite: ${topic}`, preview: 'A short summary and what to do next' },
    { subject: `${topic}: what is changing`, preview: 'Two minutes to read, nothing to do today' },
  ][i % 3];
  return { ...v, body: `Hi {first},\n\nA quick note about ${topic.toLowerCase()}.\n\n[Draft body: three short paragraphs generated from the audience and the segment's product-use fields.]\n\nQuestions? Reply here and {owner} will follow up.` };
}

export function draftFor(campaignId: string, campaignName: string, lang: 'EN' | 'JP', variant: number): Draft {
  if (campaignId === 'link-upsell-nov') {
    const set = lang === 'JP' ? LINK_JP : LINK_EN;
    return set[variant % set.length];
  }
  return generic(campaignName, lang, variant);
}

export const langFor = (region: string): 'EN' | 'JP' => (region === 'JP' ? 'JP' : 'EN');
