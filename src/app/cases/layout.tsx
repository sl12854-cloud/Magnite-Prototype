import "./case-router.css";
import { dmSans, stix } from "./fonts";

export const metadata = { title: "Case Router · Mandala" };

export default function CasesLayout({ children }: { children: React.ReactNode }) {
  return <div className={`cr ${dmSans.variable} ${stix.variable}`}>{children}</div>;
}
