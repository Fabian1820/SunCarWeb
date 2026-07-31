"use client";

import { Battery, BatteryWarning, Zap } from "lucide-react";
import { useEstadoEquipoOficina } from "@/hooks/use-equipos-felicity";
import type { TipoEstadoOficina } from "@/lib/types/feats/equipos-felicity/equipos-felicity-types";

const ESTILO_POR_TIPO: Record<TipoEstadoOficina, { clase: string; Icono: typeof Zap }> = {
  buena: { clase: "bg-emerald-50 text-emerald-700 ring-emerald-100", Icono: Zap },
  mala: { clase: "bg-rose-50 text-rose-700 ring-rose-100", Icono: BatteryWarning },
  normal: { clase: "bg-gray-50 text-gray-600 ring-gray-100", Icono: Battery },
};

/** Estado eléctrico del equipo de oficina, mostrado arriba de "Inicio" en la barra lateral. */
export function EstadoOficinaSidebar() {
  const { estado } = useEstadoEquipoOficina();

  if (!estado?.configurado) return null;

  const { clase, Icono } = ESTILO_POR_TIPO[estado.tipo || "normal"];
  const detalle = [estado.alias, estado.planta_nombre].filter(Boolean).join(" · ") || undefined;

  return (
    <div
      className={`mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ${clase}`}
      title={detalle}
    >
      <Icono className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate">{estado.texto}</span>
    </div>
  );
}
