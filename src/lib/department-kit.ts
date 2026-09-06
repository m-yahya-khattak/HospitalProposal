import { deptSource, evalFormula } from "@/lib/engine";
import { formulaPreview, sourceOptions } from "@/lib/formula-label";
import type { CatalogItem, Evaluation, Formula, PlanningModel } from "@/lib/types";

function formulaSourceId(formula: Formula): string | null {
  if (formula.type === "constant" || formula.type === "sum") return null;
  return formula.source;
}

export function formulaUsesDept(formula: Formula, deptId: string) {
  return formulaSourceId(formula) === deptSource(deptId);
}

export function specialtySourceIds(specialtyId: string) {
  const ids = [`specialty:${specialtyId}`];
  if (specialtyId === "cath-lab") ids.push("cathLab");
  if (specialtyId === "labour-delivery") ids.push("labourDelivery");
  return ids;
}

export function formulaUsesSpecialty(formula: Formula, specialtyId: string) {
  const source = formulaSourceId(formula);
  return Boolean(source && specialtySourceIds(specialtyId).includes(source));
}

export type DepartmentKitLine = {
  item: CatalogItem;
  itemIndex: number;
  formulaIndex: number;
  formula: Formula;
  formulaLabel: string;
  fromThisDept: number;
  itemQty: number;
};

export function departmentKit(
  model: PlanningModel,
  result: Evaluation,
  deptId: string,
): DepartmentKitLine[] {
  const sources = sourceOptions(model);
  const lines: DepartmentKitLine[] = [];

  for (const [itemIndex, item] of model.items.entries()) {
    const itemQty = result.items.find((row) => row.id === item.id)?.qty ?? 0;
    for (const [formulaIndex, formula] of item.contributions.entries()) {
      if (!formulaUsesDept(formula, deptId)) continue;
      lines.push({
        item,
        itemIndex,
        formulaIndex,
        formula,
        formulaLabel: formulaPreview(formula, sources),
        fromThisDept: evalFormula(formula, result.sources, new Map()),
        itemQty,
      });
    }
  }

  return lines;
}

export type SpecialtyKitLine = DepartmentKitLine;

export function specialtyKit(
  model: PlanningModel,
  result: Evaluation,
  specialtyId: string,
): SpecialtyKitLine[] {
  const sources = sourceOptions(model);
  const lines: SpecialtyKitLine[] = [];

  for (const [itemIndex, item] of model.items.entries()) {
    const itemQty = result.items.find((row) => row.id === item.id)?.qty ?? 0;
    for (const [formulaIndex, formula] of item.contributions.entries()) {
      if (!formulaUsesSpecialty(formula, specialtyId)) continue;
      lines.push({
        item,
        itemIndex,
        formulaIndex,
        formula,
        formulaLabel: formulaPreview(formula, sources),
        fromThisDept: evalFormula(formula, result.sources, new Map()),
        itemQty,
      });
    }
  }

  return lines;
}
