import { NextResponse } from "next/server";
import { loadRoutingMetrics, DEFAULT_FROM, DEFAULT_TO } from "@/lib/metrics/load";

export const dynamic = "force-dynamic";

/**
 * GET /api/metrics/routing?from=&to=   (MAG-17)
 *
 * Everything on wireframe A2, computed from case rows. Dates are ISO; both
 * are optional and default to the period the wireframe shows.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parse = (key: string, fallback: Date) => {
    const raw = url.searchParams.get(key);
    if (!raw) return fallback;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? fallback : d;
  };

  const from = parse("from", DEFAULT_FROM);
  const to = parse("to", DEFAULT_TO);
  if (from > to) {
    return NextResponse.json({ error: "from must be before to" }, { status: 400 });
  }

  return NextResponse.json(await loadRoutingMetrics({ from, to }));
}
