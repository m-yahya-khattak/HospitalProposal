import { BOM_CAPEX_LINE_ID } from "@/lib/engine";
import type { FxSettings, PlanningModel } from "@/lib/types";

export const BASE_CURRENCY = "USD";

export const COMMON_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "TZS",
  "KES",
  "UGX",
  "RWF",
  "AED",
  "SAR",
  "INR",
  "PKR",
  "CNY",
  "JPY",
  "ZAR",
  "AUD",
  "CAD",
  "CHF",
  "NGN",
  "EGP",
] as const;

export type FxTable = {
  base: typeof BASE_CURRENCY;
  rates: Record<string, number>;
  asOf: string;
};

export function defaultFx(): FxSettings {
  return { displayCurrency: BASE_CURRENCY, source: "live" };
}

export function normalizeCurrencyCode(value: unknown) {
  if (typeof value !== "string") return BASE_CURRENCY;
  const code = value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
  return code.length === 3 ? code : BASE_CURRENCY;
}

export function normalizeFx(value: unknown): FxSettings {
  const raw =
    value && typeof value === "object" ? (value as Partial<FxSettings>) : {};
  const displayCurrency = normalizeCurrencyCode(raw.displayCurrency);
  const source: FxSettings["source"] =
    raw.source === "pinned" || raw.source === "override" ? raw.source : "live";
  const rate =
    typeof raw.rate === "number" && Number.isFinite(raw.rate) && raw.rate > 0
      ? raw.rate
      : undefined;
  const asOf = typeof raw.asOf === "string" ? raw.asOf : undefined;
  if (displayCurrency === BASE_CURRENCY) {
    return { displayCurrency, source: "live" };
  }
  return { displayCurrency, source, rate, asOf };
}

export function normalizePlanningModel(model: PlanningModel): PlanningModel {
  const next = structuredClone(model);
  const capex = next.capex as PlanningModel["capex"] & { fxRate?: number };
  delete capex.fxRate;
  next.fx = normalizeFx(next.fx);
  for (const line of next.capex.lines) {
    line.fromBom = line.id === BOM_CAPEX_LINE_ID;
  }
  return next;
}

export function currencyName(code: string) {
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "currency" }).of(code) ?? code
    );
  } catch {
    return code;
  }
}

export function currencyOptions(liveCodes: string[] = []) {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const code of [...COMMON_CURRENCIES, ...liveCodes.map(normalizeCurrencyCode)]) {
    if (!code || seen.has(code)) continue;
    seen.add(code);
    list.push(code);
  }
  const preferred = new Set<string>(COMMON_CURRENCIES);
  return list.sort((a, b) => {
    const ap = preferred.has(a) ? 0 : 1;
    const bp = preferred.has(b) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    if (ap === 0) {
      return (
        COMMON_CURRENCIES.indexOf(a as (typeof COMMON_CURRENCIES)[number]) -
        COMMON_CURRENCIES.indexOf(b as (typeof COMMON_CURRENCIES)[number])
      );
    }
    return a.localeCompare(b);
  });
}

export function resolveRate(
  currency: string,
  fx: FxSettings,
  live?: FxTable | null,
): { rate: number; source: FxSettings["source"]; asOf?: string; missing: boolean } {
  const code = normalizeCurrencyCode(currency);
  if (code === BASE_CURRENCY) {
    return { rate: 1, source: "live", asOf: live?.asOf, missing: false };
  }
  if (
    (fx.source === "pinned" || fx.source === "override") &&
    normalizeCurrencyCode(fx.displayCurrency) === code &&
    typeof fx.rate === "number" &&
    fx.rate > 0
  ) {
    return {
      rate: fx.rate,
      source: fx.source,
      asOf: fx.asOf,
      missing: false,
    };
  }
  const liveRate = live?.rates[code];
  if (typeof liveRate === "number" && liveRate > 0) {
    return { rate: liveRate, source: "live", asOf: live?.asOf, missing: false };
  }
  return { rate: 1, source: "live", asOf: live?.asOf, missing: true };
}

export function toDisplay(usd: number, rate: number) {
  return usd * rate;
}

function fractionDigits(currency: string, compact: boolean) {
  if (compact) return 1;
  if (currency === "JPY" || currency === "KRW") return 0;
  return 0;
}

export function formatCurrencyAmount(
  amount: number,
  currency: string,
  compact = false,
) {
  const code = normalizeCurrencyCode(currency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: fractionDigits(code, compact),
    }).format(amount);
  } catch {
    const n = new Intl.NumberFormat("en-US", {
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 0,
    }).format(amount);
    return `${code} ${n}`;
  }
}

export function formatMoney(
  usd: number,
  currency: string,
  rate: number,
  compact = false,
) {
  return formatCurrencyAmount(toDisplay(usd, rate), currency, compact);
}

export function formatRate(currency: string, rate: number) {
  const code = normalizeCurrencyCode(currency);
  if (code === BASE_CURRENCY) return "1 USD";
  const digits = rate >= 100 ? 0 : rate >= 10 ? 2 : 4;
  const n = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(rate);
  return `1 USD = ${n} ${code}`;
}

export function formatFxAsOf(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
