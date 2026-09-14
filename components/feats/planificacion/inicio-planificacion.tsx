"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanificacionService } from "@/lib/services/feats/planificacion/planificacion-service";
import { DIAS, MESES, aFecha, desplazar, nombreDia } from "@/components/feats/planificacion/fechas";
import type { Planificacion } from "@/lib/types/feats/planificacion/planificacion-types";

const RAPIDOS = [
  { dias: 0, titulo: "Hoy" },
  { dias: 1, titulo: "Mañana" },
  { dias: 2, titulo: "Pasado mañana" },
];

interface Props {
  hoy: string;
  onElegir: (fecha: string) => void;
}

/**
 * Lo primero al entrar: qué día se planifica. Nada más.
 *
 * Mañana va destacado porque es lo que se planifica casi siempre. Debajo, los
 * días que ya tienen algo, para volver a uno y seguir.
 */
export function InicioPlanificacion({ hoy, onElegir }: Props) {
  const [planes, setPlanes] = useState<Planificacion[] | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    PlanificacionService.listar(hoy, desplazar(hoy, 60))
      .then((lista) => {
        if (cancelado) return;
        setPlanes(
          lista
            .filter((p) => (p.trabajos?.length ?? 0) > 0)
            .sort((a, b) => a.fecha.localeCompare(b.fecha)),
        );
      })
      .catch(() => {
        if (cancelado) return;
        setPlanes([]);
        setFallo(true);
      });
    return () => {
      cancelado = true;
    };
  }, [hoy]);

  const trabajosDe = new Map((planes ?? []).map((p) => [p.fecha.slice(0, 10), p.trabajos.length]));

  return (
    <div className="mx-auto max-w-2xl pt-2">
      <h2 className="text-2xl font-semibold text-gray-900">¿Qué día quieres planificar?</h2>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {RAPIDOS.map(({ dias, titulo }) => {
          const fecha = desplazar(hoy, dias);
          const d = aFecha(fecha);
          const n = trabajosDe.get(fecha) ?? 0;
          return (
            <button
              key={dias}
              type="button"
              onClick={() => onElegir(fecha)}
              className={cn(
                "flex flex-col items-start rounded-xl border bg-white px-4 py-4 text-left shadow-sm transition-colors",
                "hover:border-emerald-600 hover:bg-emerald-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                dias === 1 ? "border-emerald-600 ring-1 ring-emerald-600" : "border-gray-200",
              )}
            >
              <span className="text-lg font-semibold text-gray-900">{titulo}</span>
              <span className="text-sm text-gray-600">
                {DIAS[d.getDay()]} {d.getDate()} de {MESES[d.getMonth()]}
              </span>
              <span className={cn("mt-2 text-xs font-medium", n ? "text-emerald-800" : "text-gray-500")}>
                {n ? `${n} trabajo${n === 1 ? "" : "s"} ya planificado${n === 1 ? "" : "s"}` : "Sin planificar"}
              </span>
            </button>
          );
        })}
      </div>

      <label className="mt-4 inline-flex flex-wrap items-center gap-2 text-sm text-gray-700">
        <CalendarDays className="h-4 w-4 text-gray-500" aria-hidden />
        Otro día:
        <input
          type="date"
          onChange={(e) => e.target.value && onElegir(e.target.value)}
          className="h-10 rounded-md border border-input bg-white px-2.5 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        />
      </label>

      <section className="mt-10">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Días ya planificados</h3>
        {planes === null ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando…
          </p>
        ) : planes.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            {fallo ? "No se pudieron cargar los días planificados." : "Todavía no hay ningún día planificado."}
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-lg border bg-white">
            {planes.map((p) => {
              const fecha = p.fecha.slice(0, 10);
              const n = p.trabajos.length;
              const cerrados = p.trabajos.filter((t) => t.estado !== "planificado").length;
              return (
                <li key={fecha}>
                  <button
                    type="button"
                    onClick={() => onElegir(fecha)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900">{nombreDia(fecha, hoy)}</span>
                      <span className="block text-xs text-gray-500">
                        {n} trabajo{n === 1 ? "" : "s"}
                        {cerrados ? ` · ${cerrados} cerrado${cerrados === 1 ? "" : "s"}` : ""}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
