import type { TipoTrabajoPlanificado } from "@/lib/types/feats/instalaciones/planificacion-trabajos-types";

export const STORAGE_KEY = "suncar_planificacion_diaria_trabajos_v1";

export const TYPE_LABEL: Record<TipoTrabajoPlanificado, string> = {
  visita: "Visita",
  entrega_equipamiento: "Entrega de Equipamiento",
  instalacion_nueva: "Instalación Nueva",
  instalacion_en_proceso: "Instalación en Proceso",
  averia: "Avería",
};

export const TYPE_BADGE_CLASS: Record<TipoTrabajoPlanificado, string> = {
  visita: "bg-orange-100 text-orange-800",
  entrega_equipamiento: "bg-blue-100 text-blue-800",
  instalacion_nueva: "bg-emerald-100 text-emerald-800",
  instalacion_en_proceso: "bg-purple-100 text-purple-800",
  averia: "bg-red-100 text-red-800",
};

export const TYPE_ORDER: Record<TipoTrabajoPlanificado, number> = {
  visita: 1,
  entrega_equipamiento: 2,
  instalacion_nueva: 3,
  instalacion_en_proceso: 4,
  averia: 5,
};

export const SUMMARY_VISIBLE_LIMIT = 30;

export const BRIGADA_PREFIX = "brigada:";
export const TECNICO_PREFIX = "tecnico:";
