import { deptSource } from "@/lib/engine";
import type { Formula, PlanningModel } from "@/lib/types";

export type SourceOption = {
  id: string;
  label: string;
  short: string;
  group: string;
};

export function sourceOptions(model: PlanningModel): SourceOption[] {
  const options: SourceOption[] = [
    { id: "ot", label: "Operation theatres", short: "OT", group: "Theatres" },
    {
      id: "minorOt",
      label: "Minor theatres",
      short: "Minor",
      group: "Theatres",
    },
    { id: "cathLab", label: "Cath lab", short: "Cath", group: "Theatres" },
    {
      id: "labourDelivery",
      label: "Labour & delivery rooms",
      short: "L&D",
      group: "Theatres",
    },
  ];
  for (const d of model.departments) {
    options.push({
      id: deptSource(d.id),
      label: `${d.name} beds`,
      short: d.name,
      group: "Departments",
    });
  }
  for (const s of model.specialties) {
    options.push({
      id: `specialty:${s.id}`,
      label: `${s.name} (on/off)`,
      short: s.name,
      group: "Specialties",
    });
  }
  return options;
}

export function formulaPreview(
  formula: Formula,
  sources: SourceOption[],
): string {
  const hidden: Record<string, string> = {
    totalBeds: "total beds",
    furnitureBeds: "furnished beds",
  };
  const name = (id: string) =>
    sources.find((s) => s.id === id)?.label ?? hidden[id] ?? id;
  switch (formula.type) {
    case "timesSource":
      return formula.n === 1
        ? `1 per ${name(formula.source)}`
        : `${formula.n} × ${name(formula.source)}`;
    case "perSource":
      return `1 per ${formula.n} ${name(formula.source)}`;
    case "oneIfExists": {
      const option = sources.find((s) => s.id === formula.source);
      const existsWord =
        option?.group === "Specialties" ? "is on" : "exist";
      return formula.n === 1
        ? `1 if ${name(formula.source)} ${existsWord}`
        : `${formula.n} if ${name(formula.source)} ${existsWord}`;
    }
    case "constant":
      return `Always ${formula.value}`;
    case "sum":
      return `Sum of ${formula.itemIds.length} items`;
  }
}

export function emptyFormula(): Formula {
  return { type: "timesSource", source: "ot", n: 1 };
}
