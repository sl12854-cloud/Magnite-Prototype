import Link from "next/link";
import { TABLES, type TableSlug } from "@/lib/tables";

export const dynamic = "force-dynamic";

export default async function Home() {
  const slugs = Object.keys(TABLES) as TableSlug[];
  const counts = await Promise.all(slugs.map((s) => TABLES[s].count()));

  return (
    <>
      <h1>Magnite Prototype · mock data</h1>
      <p className="sub">
        Salesforce-shaped tables in SQLite via Prisma. Reload rows any time with <code>npm run db:reset</code>.
      </p>
      <div className="grid">
        {slugs.map((slug, i) => (
          <Link key={slug} href={`/tables/${slug}`} className="tile">
            <div className="label">{TABLES[slug].label}</div>
            <div className="count">{counts[i]}</div>
            <div className="hint">{TABLES[slug].hint}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
