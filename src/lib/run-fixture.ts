import { seedModel } from "../data/seed-model";
import { evaluate, excel200Mismatches } from "./engine";

const result = evaluate(seedModel);
const errors = excel200Mismatches(result);
if (errors.length) {
  console.error("Fixture mismatches:\n" + errors.join("\n"));
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
});
