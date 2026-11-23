import Link from "next/link";
import { notFound } from "next/navigation";
import { TABLES, isTableSlug, type TableSlug } from "@/lib/tables";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

/** Flattens included relations ({ account: { name } } -> "account.name") and hides noisy columns. */
function flatten(row: Row): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "updatedAt") continue;
    if (v && typeof v === "object" && !(v instanceof Date)) {
      for (const [ik, iv] of Object.entries(v as Row)) out[`${k}.${ik}`] = iv;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (v instanceof Date) return v.toISOString().replace("T", " ").slice(0, 16);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return v.toLocaleString("en-US");
  return String(v);
}

export default async function TablePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isTableSlug(slug)) notFound();

  const rows = (await TABLES[slug].list()).map((r) => flatten(r as Row));
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const slugs = Object.keys(TABLES) as TableSlug[];

  return (
    <>
      <nav className="nav">
        <Link href="/">Overview</Link>
        {slugs.map((s) => (
          <Link key={s} href={`/tables/${s}`} className={s === slug ? "active" : undefined}>
            {TABLES[s].label}
          </Link>
        ))}
      </nav>
      <h1>{TABLES[slug].label}</h1>
      <p className="sub">
        {rows.length} rows · {TABLES[slug].hint}
      </p>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={(r.id as string) ?? i}>
                {columns.map((c) => (
                  <td key={c} className={r[c] == null ? "muted" : undefined} title={fmt(r[c])}>
                    {fmt(r[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
