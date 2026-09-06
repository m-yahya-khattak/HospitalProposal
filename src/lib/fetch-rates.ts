import { BASE_CURRENCY, type FxTable } from "@/lib/currency";

function asTable(rates: Record<string, number>, asOf: string): FxTable {
  const normalized: Record<string, number> = { [BASE_CURRENCY]: 1 };
  for (const [key, value] of Object.entries(rates)) {
    const code = key.toUpperCase().replace(/[^A-Z]/g, "");
    if (code.length !== 3 || !Number.isFinite(value) || value <= 0) continue;
    normalized[code] = value;
  }
  return { base: BASE_CURRENCY, rates: normalized, asOf };
}

async function fromOpenEr(): Promise<FxTable> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`open.er-api ${res.status}`);
  const json = (await res.json()) as {
    result?: string;
    time_last_update_utc?: string;
    time_last_update_unix?: number;
    rates?: Record<string, number>;
  };
  if (json.result !== "success" || !json.rates) {
    throw new Error("open.er-api payload");
  }
  const asOf = json.time_last_update_unix
    ? new Date(json.time_last_update_unix * 1000).toISOString()
    : new Date(json.time_last_update_utc ?? Date.now()).toISOString();
  return asTable(json.rates, asOf);
}

async function fromCurrencyApi(): Promise<FxTable> {
  const res = await fetch(
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json",
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`currency-api ${res.status}`);
  const json = (await res.json()) as {
    date?: string;
    usd?: Record<string, number>;
  };
  if (!json.usd) throw new Error("currency-api payload");
  const asOf = json.date ? new Date(`${json.date}T00:00:00Z`).toISOString() : new Date().toISOString();
  return asTable(json.usd, asOf);
}

export async function fetchUsdRates(): Promise<FxTable> {
  try {
    return await fromOpenEr();
  } catch {
    return await fromCurrencyApi();
  }
}
