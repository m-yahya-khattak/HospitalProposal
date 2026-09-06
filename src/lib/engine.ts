import { modelCategories } from "@/lib/format";
import type {
  CapexLineResult,
  CatalogItem,
  CategoryRollup,
  DeptResult,
  Evaluation,
  Formula,
  ItemResult,
  PlanningModel,
} from "@/lib/types";

export const BOM_CAPEX_LINE_ID = "medical-equipment";

export function deptSource(id: string) {
  return `dept:${id}.beds`;
}

function roundQty(n: number) {
  if (!Number.isFinite(n) || n <= 1e-12) return 0;
  return Math.ceil(n - 1e-10);
}

function allocateBeds(model: PlanningModel): DeptResult[] {
  const specialtyOn = new Map(
    model.specialties.map((s) => [s.id, s.enabled]),
  );

  return model.departments.map((d) => {
    const gatedOff = Boolean(d.specialtyId && !specialtyOn.get(d.specialtyId));
    const rawBeds =
      typeof d.beds === "number"
        ? d.beds
        : Math.round((model.totalBeds * d.sharePercent) / 100);
    const beds = gatedOff ? 0 : Math.max(0, Math.round(rawBeds));
    return {
      id: d.id,
      name: d.name,
      sharePercent: d.sharePercent,
      beds,
      furniture: d.furniture,
      kpiCritical: Boolean(d.kpiCritical),
    };
  });
}

const MIN_BEDS = 10;
const MAX_BEDS = 2000;

type AreaBand = { beds: number; sqftPerBed: number };

function sortedBands(bands: AreaBand[]) {
  return [...bands]
    .filter(
      (b) =>
        Number.isFinite(b.beds) &&
        Number.isFinite(b.sqftPerBed) &&
        b.beds > 0 &&
        b.sqftPerBed > 0,
    )
    .sort((a, b) => a.beds - b.beds);
}

export function interpolateSqft(beds: number, bands: AreaBand[]) {
  const sorted = sortedBands(bands);
  if (sorted.length === 0) return 0;
  if (beds <= sorted[0].beds) return sorted[0].sqftPerBed;
  const last = sorted[sorted.length - 1];
  if (beds >= last.beds) return last.sqftPerBed;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const span = b.beds - a.beds;
    if (span === 0) continue;
    if (beds >= a.beds && beds <= b.beds) {
      const t = (beds - a.beds) / span;
      return a.sqftPerBed + t * (b.sqftPerBed - a.sqftPerBed);
    }
  }
  return last.sqftPerBed;
}

export function areaFromBeds(beds: number, bands: AreaBand[]) {
  return beds * interpolateSqft(beds, bands);
}

function bedsInSegment(
  area: number,
  b0: number,
  s0: number,
  b1: number,
  s1: number,
) {
  const span = b1 - b0;
  if (span === 0) return null;
  const m = (s1 - s0) / span;
  const c = s0 - m * b0;
  const lo = Math.min(b0, b1);
  const hi = Math.max(b0, b1);
  const inRange = (x: number) => x >= lo - 1e-6 && x <= hi + 1e-6 && x > 0;
  if (Math.abs(m) < 1e-12) {
    if (Math.abs(c) < 1e-12) return null;
    const B = area / c;
    return inRange(B) ? B : null;
  }
  const disc = c * c + 4 * m * area;
  if (disc < 0) return null;
  const sqrt = Math.sqrt(disc);
  const r1 = (-c + sqrt) / (2 * m);
  const r2 = (-c - sqrt) / (2 * m);
  if (inRange(r1)) return r1;
  if (inRange(r2)) return r2;
  return null;
}

export function bedsFromArea(area: number, bands: AreaBand[]) {
  if (!Number.isFinite(area) || area <= 0) return MIN_BEDS;
  const sorted = sortedBands(bands);
  if (sorted.length === 0) return MIN_BEDS;

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (area <= first.beds * first.sqftPerBed) {
    return clampBeds(area / first.sqftPerBed);
  }
  if (area >= last.beds * last.sqftPerBed) {
    return clampBeds(area / last.sqftPerBed);
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const a0 = a.beds * a.sqftPerBed;
    const a1 = b.beds * b.sqftPerBed;
    if (area < Math.min(a0, a1) - 1e-6 || area > Math.max(a0, a1) + 1e-6) {
      continue;
    }
    const root = bedsInSegment(
      area,
      a.beds,
      a.sqftPerBed,
      b.beds,
      b.sqftPerBed,
    );
    if (root != null) return clampBeds(root);
  }

  let lo = MIN_BEDS;
  let hi = MAX_BEDS;
  for (let n = 0; n < 40; n++) {
    const mid = (lo + hi) / 2;
    if (areaFromBeds(mid, sorted) < area) lo = mid;
    else hi = mid;
  }
  return clampBeds((lo + hi) / 2);
}

function clampBeds(n: number) {
  if (!Number.isFinite(n)) return MIN_BEDS;
  return Math.max(MIN_BEDS, Math.min(MAX_BEDS, Math.round(n)));
}

export function scaleHospitalBeds(model: PlanningModel, total: number) {
  const nextTotal = clampBeds(total);
  const current = model.departments.map((dept) => {
    if (typeof dept.beds === "number") return Math.max(0, Math.round(dept.beds));
    return Math.round((model.totalBeds * dept.sharePercent) / 100);
  });
  const prevTotal = current.reduce((sum, n) => sum + n, 0) || model.totalBeds;
  const scaled = current.map((n) => Math.round((n * nextTotal) / prevTotal));
  const drift = nextTotal - scaled.reduce((sum, n) => sum + n, 0);
  if (scaled.length) scaled[scaled.length - 1] += drift;
  model.totalBeds = nextTotal;
  model.departments.forEach((dept, index) => {
    dept.beds = scaled[index] ?? 0;
    dept.sharePercent = nextTotal ? (dept.beds / nextTotal) * 100 : 0;
  });
}

export function evalFormula(
  formula: Formula,
  sources: Record<string, number>,
  itemQtyRaw: Map<string, number>,
): number {
  switch (formula.type) {
    case "perSource": {
      const s = sources[formula.source] ?? 0;
      if (!formula.n) return 0;
      return s / formula.n;
    }
    case "timesSource":
      return (sources[formula.source] ?? 0) * formula.n;
    case "oneIfExists":
      return (sources[formula.source] ?? 0) > 0 ? formula.n : 0;
    case "constant":
      return formula.value;
    case "sum":
      return formula.itemIds.reduce((acc, id) => acc + (itemQtyRaw.get(id) ?? 0), 0);
  }
}

function itemQtyRaw(
  item: CatalogItem,
  sources: Record<string, number>,
  resolved: Map<string, number>,
): number {
  if (!item.enabled) return 0;
  return item.contributions.reduce(
    (acc, f) => acc + evalFormula(f, sources, resolved),
    0,
  );
}

export function evaluate(model: PlanningModel): Evaluation {
  const departments = allocateBeds(model);
  const shareTotal = model.departments.reduce((s, d) => s + d.sharePercent, 0);
  const furnitureBeds = departments
    .filter((d) => d.furniture)
    .reduce((s, d) => s + d.beds, 0);
  const criticalCareBeds = departments
    .filter((d) => d.kpiCritical)
    .reduce((s, d) => s + d.beds, 0);

  const specialtyOn = new Map(
    model.specialties.map((s) => [s.id, s.enabled]),
  );
  const labourOn = Boolean(specialtyOn.get(model.theatre.labourSpecialtyId));
  const cathOn = Boolean(specialtyOn.get(model.theatre.cathSpecialtyId));

  const otRaw = model.theatre.otPerBeds
    ? model.totalBeds / model.theatre.otPerBeds
    : 0;
  const minorOtRaw = model.theatre.minorPerOt
    ? otRaw / model.theatre.minorPerOt
    : 0;
  const labourRaw = labourOn && model.theatre.ldPerBeds
    ? model.totalBeds / model.theatre.ldPerBeds
    : 0;
  const cathLab = cathOn ? model.theatre.cathLabCount : 0;

  const sources: Record<string, number> = {
    totalBeds: model.totalBeds,
    furnitureBeds,
    ot: otRaw,
    minorOt: minorOtRaw,
    cathLab,
    labourDelivery: labourRaw,
  };
  for (const d of departments) {
    sources[deptSource(d.id)] = d.beds;
  }
  for (const s of model.specialties) {
    sources[`specialty:${s.id}`] = s.enabled ? 1 : 0;
  }

  const resolved = new Map<string, number>();
  const pending = [...model.items];
  let guard = 0;
  while (pending.length && guard < model.items.length + 2) {
    const still: CatalogItem[] = [];
    for (const item of pending) {
      const needsSum = item.contributions.some((c) => c.type === "sum");
      if (needsSum) {
        const ids = item.contributions
          .filter((c): c is Extract<Formula, { type: "sum" }> => c.type === "sum")
          .flatMap((c) => c.itemIds);
        if (ids.some((id) => !resolved.has(id))) {
          still.push(item);
          continue;
        }
      }
      resolved.set(item.id, itemQtyRaw(item, sources, resolved));
    }
    pending.length = 0;
    pending.push(...still);
    guard += 1;
  }
  for (const item of pending) {
    resolved.set(item.id, itemQtyRaw(item, sources, resolved));
  }

  const items: ItemResult[] = model.items.map((item) => {
    const qtyRaw = resolved.get(item.id) ?? 0;
    const qty = item.enabled ? roundQty(qtyRaw) : 0;
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      enabled: item.enabled,
      qtyRaw,
      qty,
      premiumUnit: item.premiumUnit,
      budgetUnit: item.budgetUnit,
      premiumCost: qty * item.premiumUnit,
      budgetCost: qty * item.budgetUnit,
    };
  });

  const enabledItems = items.filter((i) => i.enabled);
  const equipmentUnits = enabledItems
    .filter(
      (i) =>
        i.category === "ward-equipment" || i.category === "theatre-equipment",
    )
    .reduce((s, i) => s + i.qty, 0);
  const furnitureUnits = enabledItems
    .filter((i) => i.category === "furniture")
    .reduce((s, i) => s + i.qty, 0);
  const categoryRollup: CategoryRollup[] = modelCategories(model).map((id) => {
    const rows = enabledItems.filter((i) => i.category === id);
    return {
      id,
      qty: rows.reduce((s, i) => s + i.qty, 0),
      premium: rows.reduce((s, i) => s + i.premiumCost, 0),
      budget: rows.reduce((s, i) => s + i.budgetCost, 0),
    };
  });
  const bomPremium = enabledItems.reduce((s, i) => s + i.premiumCost, 0);
  const bomBudget = enabledItems.reduce((s, i) => s + i.budgetCost, 0);

  const sqftPerBed = interpolateSqft(model.totalBeds, model.capex.areaBands);
  const areaSqft = model.totalBeds * sqftPerBed;

  const capexLines: CapexLineResult[] = model.capex.lines.map((line) => {
    const fromBom = line.id === BOM_CAPEX_LINE_ID;
    const premium = fromBom ? bomPremium : areaSqft * line.ratePerSqft;
    const budget = fromBom ? bomBudget : areaSqft * line.ratePerSqft;
    return {
      id: line.id,
      name: line.name,
      fromBom,
      premium,
      budget,
    };
  });

  const totalPremium = capexLines.reduce((s, l) => s + l.premium, 0);
  const totalBudget = capexLines.reduce((s, l) => s + l.budget, 0);

  const ot = roundQty(otRaw);
  const minorOt = roundQty(minorOtRaw);
  const labourDelivery = roundQty(labourRaw);

  return {
    totalBeds: model.totalBeds,
    shareTotal,
    departments,
    furnitureBeds,
    criticalCareBeds,
    theatres: {
      otRaw,
      minorOtRaw,
      ot,
      minorOt,
      cathLab,
      labourDeliveryRaw: labourRaw,
      labourDelivery,
      totalRooms: ot + minorOt + cathLab + labourDelivery,
    },
    sources,
    items,
    equipmentUnits,
    furnitureUnits,
    categoryRollup,
    bomPremium,
    bomBudget,
    sqftPerBed,
    areaSqft,
    capex: {
      lines: capexLines,
      totalPremium,
      totalBudget,
    },
  };
}

/** Excel 200-bed raw quantities (before ceil). Used as a fixture. */
export function excel200Mismatches(result: Evaluation): string[] {
  const errors: string[] = [];
  const near = (label: string, actual: number, expected: number) => {
    if (Math.abs(actual - expected) > 0.02) {
      errors.push(`${label}: ${actual} ≠ ${expected}`);
    }
  };
  near("beds", result.totalBeds, 200);
  near("furnitureBeds", result.furnitureBeds, 184);
  near("otRaw", result.theatres.otRaw, 4);
  near("minorOtRaw", result.theatres.minorOtRaw, 4 / 3);
  near("labourRaw", result.theatres.labourDeliveryRaw, 4);
  near("cathLab", result.theatres.cathLab, 1);
  const qty = (id: string) => result.items.find((i) => i.id === id)?.qtyRaw ?? NaN;
  near("patient-monitor", qty("patient-monitor"), 85.85833333);
  near("infusion-pump", qty("infusion-pump"), 77.525);
  near("patient-bed", qty("patient-bed"), 184);
  return errors;
}
