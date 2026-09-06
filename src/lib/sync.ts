import { normalizePlanningModel } from "@/lib/currency";
import type { PlanningModel } from "@/lib/types";

export function isPlanningModel(value: unknown): value is PlanningModel {
  if (!value || typeof value !== "object") return false;
  const v = value as PlanningModel;
  return (
    v.version === 1 &&
    typeof v.totalBeds === "number" &&
    Array.isArray(v.departments) &&
    Array.isArray(v.items) &&
    Array.isArray(v.specialties) &&
    Boolean(v.theatre) &&
    Boolean(v.capex)
  );
}

export function parsePlanningModel(value: unknown): PlanningModel | null {
  if (!isPlanningModel(value)) return null;
  return normalizePlanningModel(value);
}
