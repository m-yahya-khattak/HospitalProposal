import { seedModel } from "../data/seed-model";
import { evaluate, excel200Mismatches } from "./engine";
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
