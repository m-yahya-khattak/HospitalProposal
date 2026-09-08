import { newId } from "@/lib/id";
import type { CatalogItem, PlanningModel, QuoteProduct } from "@/lib/types";

export type QuoteDraft = {
  name: string;
  supplier: string;
  model?: string;
  currency: string;
  originalPrice: number;
  externalId?: string;
  source: QuoteProduct["source"];
};

const ALIAS: Record<string, string> = { RMB: "CNY", CNH: "CNY" };

export function quoteCurrency(value: unknown) {
  if (typeof value !== "string") return "CNY";
  const raw = value.toUpperCase().replace(/[^A-Z]/g, "");
  const mapped = ALIAS[raw] ?? raw;
  return mapped.length === 3 ? mapped : "CNY";
}

export function usdFromOriginal(
  originalPrice: number,
  currency: string,
  rates?: Record<string, number> | null,
) {
  const code = quoteCurrency(currency);
  if (!Number.isFinite(originalPrice) || originalPrice < 0) return 0;
  if (code === "USD") return originalPrice;
  const perUsd = rates?.[code];
  if (typeof perUsd === "number" && perUsd > 0) return originalPrice / perUsd;
  return originalPrice;
}

export function pricedQuote(
  draft: QuoteDraft,
  fx?: { rates?: Record<string, number>; asOf?: string } | null,
  existingId?: string,
): QuoteProduct {
  const currency = quoteCurrency(draft.currency);
  const originalPrice = Math.max(0, draft.originalPrice);
  const fxRate = currency === "USD" ? 1 : fx?.rates?.[currency];
  return {
    id: existingId ?? newId("quote"),
    name: draft.name.trim() || "Quote",
    supplier: draft.supplier.trim(),
    model: draft.model?.trim() || undefined,
    currency,
    originalPrice,
    usdUnit: usdFromOriginal(originalPrice, currency, fx?.rates ?? null),
    fxRate: typeof fxRate === "number" && fxRate > 0 ? fxRate : undefined,
    fxAsOf: fx?.asOf,
    source: draft.source,
    externalId: draft.externalId,
  };
}

export function uniqueIds(ids: string[] | undefined, known: Set<string>) {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const id of ids ?? []) {
    if (!id || seen.has(id) || !known.has(id)) continue;
    seen.add(id);
    list.push(id);
  }
  return list;
}

export function applyQuotePrices(item: CatalogItem, quotes: QuoteProduct[]) {
  const byId = new Map(quotes.map((quote) => [quote.id, quote]));
  const premiumIds = uniqueIds(item.premiumQuoteIds, new Set(byId.keys()));
  const budgetIds = uniqueIds(item.budgetQuoteIds, new Set(byId.keys()));
  item.premiumQuoteIds = premiumIds;
  item.budgetQuoteIds = budgetIds;
  const premium =
    item.premiumQuoteId && premiumIds.includes(item.premiumQuoteId)
      ? byId.get(item.premiumQuoteId)
      : undefined;
  const budget =
    item.budgetQuoteId && budgetIds.includes(item.budgetQuoteId)
      ? byId.get(item.budgetQuoteId)
      : undefined;
  item.premiumQuoteId = premium?.id ?? null;
  item.budgetQuoteId = budget?.id ?? null;
  if (premium) item.premiumUnit = premium.usdUnit;
  if (budget) item.budgetUnit = budget.usdUnit;
}

export function normalizeQuotes(model: PlanningModel): void {
  const quotes = Array.isArray(model.quotes) ? model.quotes : [];
  const cleaned: QuoteProduct[] = [];
  const seenExt = new Set<string>();
  const seenId = new Set<string>();
  for (const raw of quotes) {
    if (!raw || typeof raw !== "object") continue;
    const id = typeof raw.id === "string" && raw.id ? raw.id : newId("quote");
    if (seenId.has(id)) continue;
    seenId.add(id);
    const externalId =
      typeof raw.externalId === "string" && raw.externalId
        ? raw.externalId
        : undefined;
    if (externalId) {
      if (seenExt.has(externalId)) continue;
      seenExt.add(externalId);
    }
    const currency = quoteCurrency(raw.currency);
    const originalPrice =
      typeof raw.originalPrice === "number" && raw.originalPrice >= 0
        ? raw.originalPrice
        : 0;
    const usdUnit =
      typeof raw.usdUnit === "number" && Number.isFinite(raw.usdUnit)
        ? Math.max(0, raw.usdUnit)
        : originalPrice;
    cleaned.push({
      id,
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Quote",
      supplier: typeof raw.supplier === "string" ? raw.supplier.trim() : "",
      model:
        typeof raw.model === "string" && raw.model.trim()
          ? raw.model.trim()
          : undefined,
      currency,
      originalPrice,
      usdUnit,
      fxRate:
        typeof raw.fxRate === "number" && raw.fxRate > 0 ? raw.fxRate : undefined,
      fxAsOf: typeof raw.fxAsOf === "string" ? raw.fxAsOf : undefined,
      source: raw.source === "manual" ? "manual" : "upload",
      externalId,
    });
  }
  model.quotes = cleaned;
  const known = new Set(cleaned.map((quote) => quote.id));
  for (const item of model.items) {
    applyQuotePrices(item, cleaned);
    if (!known.has(item.premiumQuoteId ?? "")) item.premiumQuoteId = null;
    if (!known.has(item.budgetQuoteId ?? "")) item.budgetQuoteId = null;
  }
}

export function mergeQuotes(
  existing: QuoteProduct[],
  incoming: QuoteDraft[],
  fx?: { rates?: Record<string, number>; asOf?: string } | null,
) {
  const next = [...existing];
  const byExternal = new Map(
    next
      .filter((quote) => quote.externalId)
      .map((quote) => [quote.externalId as string, quote]),
  );
  let added = 0;
  let updated = 0;
  for (const draft of incoming) {
    const ext = draft.externalId;
    const found = ext ? byExternal.get(ext) : undefined;
    if (found) {
      const priced = pricedQuote(draft, fx, found.id);
      const index = next.findIndex((quote) => quote.id === found.id);
      next[index] = { ...priced, id: found.id };
      if (ext) byExternal.set(ext, next[index]);
      updated += 1;
    } else {
      const priced = pricedQuote(draft, fx);
      next.push(priced);
      if (priced.externalId) byExternal.set(priced.externalId, priced);
      added += 1;
    }
  }
  return { quotes: next, added, updated };
}

function cellText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

function headerKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function pickColumn(headers: string[], aliases: string[]) {
  const keys = headers.map(headerKey);
  for (const alias of aliases) {
    const index = keys.indexOf(headerKey(alias));
    if (index >= 0) return index;
  }
  return -1;
}

export function parseQuoteRows(headers: string[], rows: unknown[][]): QuoteDraft[] {
  const nameIdx = pickColumn(headers, [
    "translation",
    "product",
    "name",
    "chinesename",
    "item",
  ]);
  const productIdx = pickColumn(headers, ["product", "name"]);
  const supplierIdx = pickColumn(headers, [
    "brand",
    "supplier",
    "manufacturer",
    "company",
    "vendor",
  ]);
  const modelIdx = pickColumn(headers, ["model"]);
  const priceIdx = pickColumn(headers, ["price", "unitprice", "unit"]);
  const idIdx = pickColumn(headers, ["id", "ref"]);
  if (nameIdx < 0 || priceIdx < 0) return [];
  const drafts: QuoteDraft[] = [];
  for (const row of rows) {
    const translation = cellText(row[nameIdx]);
    const product = productIdx >= 0 ? cellText(row[productIdx]) : "";
    const name = translation || product;
    if (!name) continue;
    const price = Number(row[priceIdx]);
    if (!Number.isFinite(price) || price < 0) continue;
    const external = idIdx >= 0 ? cellText(row[idIdx]) : "";
    drafts.push({
      name,
      supplier: supplierIdx >= 0 ? cellText(row[supplierIdx]) : "",
      model: modelIdx >= 0 ? cellText(row[modelIdx]) : "",
      currency: "CNY",
      originalPrice: price,
      externalId: external || undefined,
      source: "upload",
    });
  }
  return drafts;
}

export function tableFromSheet(data: unknown[][]): {
  headers: string[];
  rows: unknown[][];
} | null {
  for (let i = 0; i < Math.min(data.length, 8); i++) {
    const row = (data[i] ?? []).map((cell) => cellText(cell));
    if (pickColumn(row, ["price", "unitprice"]) >= 0 &&
      pickColumn(row, ["product", "translation", "name"]) >= 0
    ) {
      return { headers: row, rows: data.slice(i + 1) };
    }
  }
  return null;
}

export function quoteLabel(quote: QuoteProduct) {
  const bits = [quote.supplier, quote.model].filter(Boolean);
  return bits.length ? `${quote.name} · ${bits.join(" · ")}` : quote.name;
}

export function formatQuoteOriginal(quote: QuoteProduct) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: quote.currency,
      maximumFractionDigits: quote.originalPrice >= 100 ? 0 : 2,
    }).format(quote.originalPrice);
  } catch {
    return `${quote.currency} ${quote.originalPrice}`;
  }
}

export function formatQuoteUsd(usd: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: usd >= 100 ? 0 : 2,
  }).format(usd);
}

export function assignQuote(
  item: CatalogItem,
  quoteId: string,
  role: "premium" | "budget" | "both",
) {
  const premium = new Set(item.premiumQuoteIds ?? []);
  const budget = new Set(item.budgetQuoteIds ?? []);
  if (role === "premium" || role === "both") premium.add(quoteId);
  if (role === "budget" || role === "both") budget.add(quoteId);
  item.premiumQuoteIds = [...premium];
  item.budgetQuoteIds = [...budget];
}

export function unassignQuote(
  item: CatalogItem,
  quoteId: string,
  role: "premium" | "budget",
) {
  if (role === "premium") {
    item.premiumQuoteIds = (item.premiumQuoteIds ?? []).filter((id) => id !== quoteId);
    if (item.premiumQuoteId === quoteId) item.premiumQuoteId = null;
  } else {
    item.budgetQuoteIds = (item.budgetQuoteIds ?? []).filter((id) => id !== quoteId);
    if (item.budgetQuoteId === quoteId) item.budgetQuoteId = null;
  }
}

export function selectQuote(
  item: CatalogItem,
  quoteId: string | null,
  role: "premium" | "budget",
  quotes: QuoteProduct[],
) {
  if (role === "premium") item.premiumQuoteId = quoteId;
  else item.budgetQuoteId = quoteId;
  applyQuotePrices(item, quotes);
}

export function quoteById(quotes: QuoteProduct[] | undefined, id?: string | null) {
  if (!id) return undefined;
  return (quotes ?? []).find((quote) => quote.id === id);
}

export async function parseQuoteWorkbook(buffer: ArrayBuffer) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName =
    workbook.SheetNames.find((name) => name.toLowerCase() === "catalog") ??
    workbook.SheetNames[0];
  if (!sheetName) return [];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];
  const table = tableFromSheet(data);
  if (!table) return [];
  return parseQuoteRows(table.headers, table.rows);
}
