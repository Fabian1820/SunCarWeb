import type { PlanTrabajoStorage } from "@/lib/types/feats/instalaciones/planificacion-trabajos-types";
import { STORAGE_KEY } from "./constants";

export const getTomorrowDateInput = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

export const readPlansFromStorage = (): PlanTrabajoStorage => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PlanTrabajoStorage;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
};

export const writePlansToStorage = (plans: PlanTrabajoStorage) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
};
