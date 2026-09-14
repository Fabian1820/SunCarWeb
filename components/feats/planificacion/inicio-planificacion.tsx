"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/shared/molecule/calendar";
import { buttonVariants } from "@/components/shared/atom/button";
import { cn } from "@/lib/utils";
import { PlanificacionService } from "@/lib/services/feats/planificacion/planificacion-service";
import { aFecha, desplazar, isoLocal, nombreDia } from "@/components/feats/planificacion/fechas";
import type { Planificacion } from "@/lib/types/feats/planificacion/planificacion-types";

interface Props {
  hoy: string;
  onElegir: (fecha: string) => void;
}

/**
 * Lo primero al entrar: qué día se planifica, en un calendario.
 *
 * Los días que ya tienen trabajos llevan un punto verde. Al lado, la lista de
 * los próximos días planificados, para volver a uno y seguir.
 */
export function InicioPlanificacion({ hoy, onElegir }: Props) {
  const [planes, setPlanes] = useState<Planificacion[] | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    PlanificacionService.listar(desplazar(hoy, -31), desplazar(hoy, 120))
      .then((lista) => !cancelado && setPlanes(lista))
      .catch(() => {
        if (cancelado) return;
        setPlanes([]);
        setFallo(true);
      });
    return () => {
      cancelado = true;
    };
  }, [hoy]);

  const conTrabajos = useMemo(() => (planes ?? []).filter((p) => (p.trabajos?.length ?? 0) > 0), [planes]);
  const diasPlanificados = useMemo(() => conTrabajos.map((p) => aFecha(p.fecha.slice(0, 10))), [conTrabajos]);
  const proximos = useMemo(
    () =>
      conTrabajos
        .filter((p) => p.fecha.slice(0, 10) >= hoy)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(0, 12),
    [conTrabajos, hoy],
  );

  return (
    <div className="mx-auto max-w-4xl pt-2">
      <h2 className="text-2xl font-semibold text-gray-900">¿Qué día quieres planificar?</h2>
      <p className="mt-1 text-sm text-gray-600">
        Toca un día en el calendario. Los que tienen un punto verde ya tienen trabajos.
      </p>

      <div className="mt-5 grid items-start gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
        <div className="justify-self-center rounded-xl border bg-white p-2 shadow-sm md:justify-self-start">
          <Calendar
            mode="single"
            locale={es}
            weekStartsOn={1}
            defaultMonth={aFecha(hoy)}
            onSelect={(d) => d && onElegir(isoLocal(d))}
            modifiers={{ planificado: diasPlanificados }}
            modifiersClassNames={{
              planificado:
                "font-semibold text-emerald-900 after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-emerald-600",
            }}
            classNames={{
              caption_label: "text-base font-semibold capitalize",
              head_cell: "w-11 rounded-md text-sm font-normal capitalize text-gray-500",
              cell: "relative h-11 w-11 p-0 text-center",
              day: cn(
                buttonVariants({ variant: "ghost" }),
                "relative h-11 w-11 p-0 text-base font-normal aria-selected:opacity-100",
              ),
              day_today: "border border-emerald-700 text-emerald-900",
            }}
          />
          <div className="flex gap-2 border-t px-2 pb-1 pt-2">
            {[
              { dias: 0, texto: "Hoy" },
              { dias: 1, texto: "Mañana" },
            ].map(({ dias, texto }) => (
              <button
                key={dias}
                type="button"
                onClick={() => onElegir(desplazar(hoy, dias))}
                className={cn(
                  "flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                  dias === 1
                    ? "bg-emerald-800 text-white hover:bg-emerald-900"
                    : "border border-gray-200 text-gray-800 hover:border-emerald-600",
                )}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Próximos días planificados</h3>
          {planes === null ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Cargando…
            </p>
          ) : proximos.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              {fallo ? "No se pudieron cargar los días planificados." : "Todavía no hay ningún día planificado."}
            </p>
          ) : (
            <ul className="mt-3 divide-y rounded-lg border bg-white">
              {proximos.map((p) => {
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
    </div>
  );
}
