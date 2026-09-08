import { seedModel } from "../data/seed-model";
import { normalizePlanningModel } from "./currency";
import {
  areaFromBeds,
  bedsFromArea,
  evaluate,
  excel200Mismatches,
} from "./engine";
import { sourceOptions } from "./formula-label";
import { parseContributions, toContributions } from "./formula-matrix";
import {
  applyQuotePrices,
  mergeQuotes,
  parseQuoteRows,
  tableFromSheet,
  usdFromOriginal,
} from "./quotes";
import type { CatalogItem } from "./types";

const result = evaluate(seedModel);
const errors = excel200Mismatches(result);
if (errors.length) {
  console.error("Fixture mismatches:\n" + errors.join("\n"));
  process.exit(1);
}

const sources = sourceOptions(seedModel).map((s) => s.id);
for (const item of seedModel.items) {
  const roundTrip = toContributions(
    parseContributions(item.contributions),
    sources,
  );
  const again = evaluate({
    ...seedModel,
    items: seedModel.items.map((row) =>
      row.id === item.id ? { ...row, contributions: roundTrip } : row,
    ),
  });
  const before = result.items.find((row) => row.id === item.id)?.qtyRaw ?? 0;
  const after = again.items.find((row) => row.id === item.id)?.qtyRaw ?? 0;
  if (Math.abs(before - after) > 0.02) {
    console.error(`Matrix round-trip changed ${item.id}: ${before} → ${after}`);
    process.exit(1);
  }
}

if (result.categoryRollup.length < 5) {
  console.error("Expected category rollups");
  process.exit(1);
}

const legacy = normalizePlanningModel({
  ...seedModel,
  capex: { ...seedModel.capex, fxRate: 2650 } as typeof seedModel.capex & {
    fxRate: number;
  },
});
if ("fxRate" in legacy.capex) {
  console.error("normalizePlanningModel left fxRate on capex");
  process.exit(1);
}
if (evaluate(legacy).capex.totalPremium !== result.capex.totalPremium) {
  console.error("Legacy fxRate still changes CAPEX totals");
  process.exit(1);
}
const bomLines = result.capex.lines.filter((line) => line.kind === "catalog");
if (bomLines.length < 5) {
  console.error("Expected catalog categories in CAPEX");
  process.exit(1);
}
if (
  Math.abs(
    result.capex.totalPremium -
      (result.capex.constructionPremium + result.capex.catalogPremium),
  ) > 0.01
) {
  console.error("CAPEX total should be construction + catalog");
  process.exit(1);
}
const withoutFurniture = evaluate({
  ...seedModel,
  capex: { ...seedModel.capex, excludedCategories: ["furniture"] },
});
if (withoutFurniture.capex.totalPremium >= result.capex.totalPremium) {
  console.error("Excluding furniture should reduce CAPEX");
  process.exit(1);
}
const stripped = normalizePlanningModel({
  ...seedModel,
  capex: {
    ...seedModel.capex,
    lines: [
      ...seedModel.capex.lines,
      { id: "medical-equipment", name: "Medical Equipment", ratePerSqft: 0 },
    ],
  },
});
if (stripped.capex.lines.some((line) => line.id === "medical-equipment")) {
  console.error("Legacy medical-equipment line should be removed");
  process.exit(1);
}
if (!Number.isFinite(result.capex.totalPremium) || result.capex.totalPremium <= 0) {
  console.error("Expected a USD CAPEX total");
  process.exit(1);
}

const bands = seedModel.capex.areaBands;
if (bedsFromArea(340000, bands) !== 200) {
  console.error(`340000 sq.ft should invert to 200 beds, got ${bedsFromArea(340000, bands)}`);
  process.exit(1);
}
if (bedsFromArea(180000, bands) !== 100) {
  console.error(`180000 sq.ft should invert to 100 beds, got ${bedsFromArea(180000, bands)}`);
  process.exit(1);
}
const fromArea = bedsFromArea(400000, bands);
const roundTrip = areaFromBeds(fromArea, bands);
if (Math.abs(roundTrip - 400000) / 400000 > 0.01) {
  console.error(`Area invert drifted: ${fromArea} beds → ${roundTrip} sq.ft`);
  process.exit(1);
}

console.log("Excel 200-bed fixture OK");
console.log({
  beds: result.totalBeds,
  furnitureBeds: result.furnitureBeds,
  ot: result.theatres.ot,
  minorOt: result.theatres.minorOt,
  equipmentUnits: result.equipmentUnits,
  bomPremium: result.bomPremium,
  areaSqft: result.areaSqft,
  categories: result.categoryRollup.map((row) => row.id),
});

const table = tableFromSheet([
  ["Catalog export"],
  [],
  ["ID", "Product", "Translation", "Brand", "Model", "Price", "URL"],
  ["A1", "病床", "Hospital bed", "Mindray", "HyBase", 12800],
  ["A2", "Monitor", "", "GE", "B450", 7300],
]);
if (!table) {
  console.error("Expected to find Catalog headers a few rows down");
  process.exit(1);
}
const drafts = parseQuoteRows(table.headers, table.rows);
if (drafts.length !== 2 || drafts[0].name !== "Hospital bed" || drafts[1].name !== "Monitor") {
  console.error("parseQuoteRows should prefer Translation, else Product");
  process.exit(1);
}
if (drafts[0].supplier !== "Mindray" || drafts[0].externalId !== "A1" || drafts[0].currency !== "CNY") {
  console.error("parseQuoteRows should map Brand, ID, and default CNY");
  process.exit(1);
}
if (Math.abs(usdFromOriginal(7300, "CNY", { CNY: 7.3 }) - 1000) > 0.01) {
  console.error("usdFromOriginal should divide by units of currency per USD");
  process.exit(1);
}
const first = mergeQuotes([], drafts, { rates: { CNY: 7.3 }, asOf: "2026-01-01" });
if (first.added !== 2 || first.updated !== 0 || first.quotes.length !== 2) {
  console.error("mergeQuotes should add new rows");
  process.exit(1);
}
const again = mergeQuotes(
  first.quotes,
  [{ ...drafts[0], originalPrice: 14600 }],
  { rates: { CNY: 7.3 }, asOf: "2026-01-01" },
);
if (again.added !== 0 || again.updated !== 1 || again.quotes.length !== 2) {
  console.error("mergeQuotes should update by externalId instead of duplicating");
  process.exit(1);
}
const priced = again.quotes.find((quote) => quote.externalId === "A1");
if (!priced || Math.abs(priced.usdUnit - 2000) > 0.01) {
  console.error(`Expected updated USD 2000, got ${priced?.usdUnit}`);
  process.exit(1);
}
const sample: CatalogItem = {
  ...seedModel.items[0],
  premiumQuoteIds: [priced.id],
  premiumQuoteId: priced.id,
  premiumUnit: 1,
};
applyQuotePrices(sample, again.quotes);
if (Math.abs(sample.premiumUnit - priced.usdUnit) > 0.01) {
  console.error("applyQuotePrices should write usdUnit onto premiumUnit");
  process.exit(1);
}

console.log("Quote parse/merge OK");
