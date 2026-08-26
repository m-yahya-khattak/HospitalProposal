import { deptSource } from "@/lib/engine";
import type { Formula, PlanningModel } from "@/lib/types";

export type SourceOption = {
  id: string;
  label: string;
  group: string;
};

export function sourceOptions(model: PlanningModel): SourceOption[] {
  const options: SourceOption[] = [
    { id: "totalBeds", label: "Total beds", group: "Hospital" },
    { id: "furnitureBeds", label: "Furniture beds", group: "Hospital" },
    { id: "ot", label: "Operation theatres", group: "Theatres" },
    { id: "minorOt", label: "Minor theatres", group: "Theatres" },
    { id: "cathLab", label: "Cath lab", group: "Theatres" },
    { id: "labourDelivery", label: "Labour & delivery rooms", group: "Theatres" },
  ];
  for (const d of model.departments) {
    options.push({
      id: deptSource(d.id),
      label: `${d.name} beds`,
      group: "Departments",
    });
  }
  return options;
}

export function formulaPreview(
  formula: Formula,
  sources: SourceOption[],
): string {
  const name = (id: string) =>
    sources.find((s) => s.id === id)?.label ?? id;
  switch (formula.type) {
    case "timesSource":
      return formula.n === 1
        ? `1 per ${name(formula.source)}`
        : `${formula.n} × ${name(formula.source)}`;
    case "perSource":
      return `1 per ${formula.n} ${name(formula.source)}`;
    case "oneIfExists":
      return formula.n === 1
        ? `1 if ${name(formula.source)} exist`
        : `${formula.n} if ${name(formula.source)} exist`;
    case "constant":
      return `Fixed ${formula.value}`;
    case "sum":
      return `Sum of ${formula.itemIds.length} items`;
  }
}

export function emptyFormula(): Formula {
  return { type: "timesSource", source: "totalBeds", n: 1 };
}
