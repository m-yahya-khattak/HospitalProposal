/**
 * Load exports/catalog-enriched.xlsx into Ahmed's Master Plan quotes library.
 * Does not change the default seed used for new projects.
 *
 *   npx tsx scripts/seed-master-quotes.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fetchUsdRates } from "../src/lib/fetch-rates";
import { mergeQuotes, parseQuoteWorkbook } from "../src/lib/quotes";
import { parsePlanningModel } from "../src/lib/sync";
import type { PlanningModel } from "../src/lib/types";

const ROOT = resolve(import.meta.dirname, "..");
const XLSX_PATH = resolve(ROOT, "exports/catalog-enriched.xlsx");
const PROJECT_NAME = "Master Plan";
const EMAIL = process.env.SEED_EMAIL ?? "ahmed@hospitalplan.com";
const PASSWORD = process.env.SEED_PASSWORD ?? "Ahmed2026!";

function loadEnv() {
  const text = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  const env: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anon =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing Supabase URL or key in .env.local");

  const buf = readFileSync(XLSX_PATH);
  const drafts = await parseQuoteWorkbook(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );
  if (!drafts.length) throw new Error(`No catalog rows in ${XLSX_PATH}`);

  const fx = await fetchUsdRates();
  const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const auth = (await authRes.json()) as {
    access_token?: string;
    user?: { id?: string; email?: string };
    error_description?: string;
    msg?: string;
  };
  if (!authRes.ok || !auth.access_token || !auth.user?.id) {
    throw new Error(auth.error_description ?? auth.msg ?? "Could not sign in as Ahmed");
  }

  const headers = {
    apikey: anon,
    Authorization: `Bearer ${auth.access_token}`,
    "Content-Type": "application/json",
  };
  const listRes = await fetch(
    `${url}/rest/v1/planning_projects?select=id,slug,name,owner_id,updated_at,model&owner_id=eq.${auth.user.id}&name=eq.${encodeURIComponent(PROJECT_NAME)}`,
    { headers },
  );
  const rows = (await listRes.json()) as Array<{
    id: string;
    slug: string;
    name: string;
    owner_id: string;
    updated_at: string;
    model: unknown;
  }>;
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error(`No "${PROJECT_NAME}" project owned by ${EMAIL}`);
  }

  const picked =
    rows.find((row) => {
      const model = parsePlanningModel(row.model);
      return model?.totalBeds === 240;
    }) ?? rows[0];
  const model: PlanningModel | null = parsePlanningModel(picked.model);
  if (!model) throw new Error(`Master Plan (${picked.slug}) has no planning model`);

  const merged = mergeQuotes(model.quotes ?? [], drafts, fx);
  model.quotes = merged.quotes;

  const patchRes = await fetch(
    `${url}/rest/v1/planning_projects?id=eq.${picked.id}`,
    {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ model }),
    },
  );
  if (!patchRes.ok) {
    const text = await patchRes.text();
    throw new Error(`Update failed ${patchRes.status}: ${text}`);
  }

  console.log(
    JSON.stringify(
      {
        project: picked.name,
        slug: picked.slug,
        owner: auth.user.email,
        parsed: drafts.length,
        quotes: merged.quotes.length,
        added: merged.added,
        updated: merged.updated,
        cnyPerUsd: fx.rates.CNY,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
