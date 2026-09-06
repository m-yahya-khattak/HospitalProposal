import { fetchUsdRates } from "@/lib/fetch-rates";

export const revalidate = 3600;

let memory: { at: number; table: Awaited<ReturnType<typeof fetchUsdRates>> } | null =
  null;
const TTL_MS = 60 * 60 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (memory && now - memory.at < TTL_MS) {
      return Response.json(memory.table, {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }
    const table = await fetchUsdRates();
    memory = { at: now, table };
    return Response.json(table, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    if (memory) {
      return Response.json(memory.table, {
        headers: { "Cache-Control": "public, max-age=60" },
      });
    }
    return Response.json({ error: "Rates unavailable" }, { status: 502 });
  }
}
