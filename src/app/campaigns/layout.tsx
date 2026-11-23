import { DM_Sans, STIX_Two_Text } from 'next/font/google';
import './campaigns.css';

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-dm-sans' });
const stix = STIX_Two_Text({ subsets: ['latin'], weight: ['600'], variable: '--font-stix' });

export const metadata = { title: 'Client Comms · Mandala' };

export default function CampaignsLayout({ children }: { children: React.ReactNode }) {
  return <div className={`mandala ${dmSans.variable} ${stix.variable}`}>{children}</div>;
}
