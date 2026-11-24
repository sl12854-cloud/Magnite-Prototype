import "../cases/case-router.css";
import { dmSans, stix } from "../cases/fonts";

export const metadata = { title: "Routing performance · Mandala" };

export default function PerfLayout({ children }: { children: React.ReactNode }) {
  return <div className={`cr ${dmSans.variable} ${stix.variable}`}>{children}</div>;
}
