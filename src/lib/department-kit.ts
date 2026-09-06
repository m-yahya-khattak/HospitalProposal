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

export type DepartmentKitLine = {
  item: CatalogItem;
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

  for (const item of model.items) {
    const itemQty = result.items.find((row) => row.id === item.id)?.qty ?? 0;
    for (const formula of item.contributions) {
      if (!formulaUsesDept(formula, deptId)) continue;
      lines.push({
        item,
        formula,
        formulaLabel: formulaPreview(formula, sources),
        fromThisDept: evalFormula(formula, result.sources, new Map()),
        itemQty,
      });
    }
  }

  return lines;
}
