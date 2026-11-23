import Link from "next/link";
import { notFound } from "next/navigation";
import { PAGE_SIZE, TABLES, isTableSlug, type TableSlug } from "@/lib/tables";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

/**
 * Flattens included relations ({ account: { name } } -> "account.name"),
 * puts them first, and hides internal ids and timestamps so the human-readable
 * columns are what you see.
 */
function flatten(row: Row): Record<string, unknown> {
  const joined: Record<string, unknown> = {};
  const own: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "id" || k === "updatedAt" || k.endsWith("Id")) continue;
    if (v && typeof v === "object" && !(v instanceof Date)) {
      for (const [ik, iv] of Object.entries(v as Row)) joined[`${k}.${ik}`] = iv;
    } else {
      own[k] = v;
    }
  }
  return { ...joined, ...own };
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (v instanceof Date) return v.toISOString().replace("T", " ").slice(0, 16);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return v.toLocaleString("en-US");
  return String(v);
}

export default async function TablePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  if (!isTableSlug(slug)) notFound();

  const { page: pageParam } = await searchParams;
  const total = await TABLES[slug].count();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(pageParam) || 1));
  const skip = (page - 1) * PAGE_SIZE;

  const rows = (await TABLES[slug].list(skip)).map((r) => flatten(r as Row));
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const slugs = Object.keys(TABLES) as TableSlug[];
  const pager = (
    <div className="pager">
      {page > 1 ? <Link href={`/tables/${slug}?page=${page - 1}`}>← Previous</Link> : <span />}
      <span>
        Page {page} of {pages} · rows {total ? skip + 1 : 0}–{Math.min(skip + PAGE_SIZE, total)} of {total.toLocaleString("en-US")}
      </span>
      {page < pages ? <Link href={`/tables/${slug}?page=${page + 1}`}>Next →</Link> : <span />}
    </div>
  );

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
        {total.toLocaleString("en-US")} rows · {TABLES[slug].hint}
      </p>
      {pager}
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
              <tr key={i}>
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
      {pager}
    </>
  );
}
