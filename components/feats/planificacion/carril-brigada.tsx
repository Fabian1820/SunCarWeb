"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { cn } from "@/lib/utils";
import { EtiquetaTipo } from "@/components/feats/planificacion/tipo-trabajo";
import type { Asignado, TrabajoPlanificado } from "@/lib/types/feats/planificacion/planificacion-types";

interface Props {
  quien: Asignado;
  subtitulo: string;
  trabajos: TrabajoPlanificado[];
  onAgregar: () => void;
  onQuitar: (trabajo: TrabajoPlanificado) => void;
  onCambiarNota: (trabajo: TrabajoPlanificado, nota: string) => void;
}

/** Una brigada (o una persona suelta) con lo que tiene ese día. */
export function CarrilBrigada({ quien, subtitulo, trabajos, onAgregar, onQuitar, onCambiarNota }: Props) {
  const vacia = trabajos.length === 0;
  return (
    <section
      className={cn(
        "flex flex-col rounded-lg border bg-white",
        vacia ? "border-gray-200" : "border-gray-300 shadow-sm",
      )}
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-gray-900">
            {quien.tipo === "brigada" ? `Brigada de ${quien.nombre}` : quien.nombre}
          </h2>
          <p className="text-xs text-gray-500">
            {subtitulo}
            {vacia ? " · sin trabajos" : ` · ${trabajos.length} trabajo${trabajos.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button size="sm" variant={vacia ? "outline" : "default"} onClick={onAgregar}>
          <Plus className="mr-1 h-4 w-4" />
          Añadir
        </Button>
      </header>

      {!vacia && (
        <ol className="divide-y border-t">
          {trabajos.map((t) => {
            const abierto = t.estado === "planificado";
            return (
              <li key={t.id || `${t.tipo}-${t.cliente_numero ?? t.lead_id}`} className="group flex gap-2 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <EtiquetaTipo tipo={t.tipo} />
                    {!abierto && (
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          t.estado === "cumplido" ? "text-emerald-800" : "text-red-700",
                        )}
                      >
                        {t.estado === "cumplido" ? "Cumplido" : "No realizado"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-gray-900">{t.nombre || "Sin nombre"}</p>
                  {t.direccion && <p className="truncate text-xs text-gray-500">{t.direccion}</p>}
                  {abierto ? (
                    <input
                      value={t.nota ?? ""}
                      onChange={(e) => onCambiarNota(t, e.target.value)}
                      placeholder="Añadir nota"
                      aria-label={`Nota para ${t.nombre}`}
                      className={cn(
                        "mt-1 w-full rounded border border-transparent bg-transparent px-1 py-0.5 -ml-1 text-xs text-gray-700",
                        "placeholder:text-emerald-700 hover:border-gray-200 focus:border-gray-300 focus:bg-white focus:outline-none",
                      )}
                    />
                  ) : (
                    t.nota && <p className="mt-1 text-xs text-gray-600">Nota: {t.nota}</p>
                  )}
                </div>
                {abierto && (
                  <button
                    type="button"
                    onClick={() => onQuitar(t)}
                    aria-label={`Quitar ${t.nombre} del plan`}
                    title="Quitar del plan"
                    className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
