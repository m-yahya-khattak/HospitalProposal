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
