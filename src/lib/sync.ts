import type { PlanningModel } from "@/lib/types";

export const STORAGE_KEY = "hospital-planning:v1";
export const CHANNEL_NAME = "hospital-planning";

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

export function loadModel(): PlanningModel | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isPlanningModel(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveModel(model: PlanningModel) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
}
