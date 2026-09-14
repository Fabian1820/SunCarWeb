"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Pencil, Plus } from "lucide-react";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/shared/molecule/calendar";
import { Button, buttonVariants } from "@/components/shared/atom/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { cn } from "@/lib/utils";
import { PlanificacionService } from "@/lib/services/feats/planificacion/planificacion-service";
import { aFecha, desplazar, isoLocal, nombreDia } from "@/components/feats/planificacion/fechas";
import { TarjetaTrabajo } from "@/components/feats/planificacion/menu-dia";
import type { Asignado, Planificacion, TrabajoPlanificado } from "@/lib/types/feats/planificacion/planificacion-types";

interface Props {
  hoy: string;
  /** Abre un día para planificarlo o cambiar lo que tiene. */
  onElegir: (fecha: string) => void;
  /** El calendario para un día nuevo, que se abre con el botón de arriba. */
  eligiendoDia: boolean;
  onEligiendoDia: (abierto: boolean) => void;
}

function nombreDe(a: Asignado): string {
  return a.tipo === "brigada" ? `Brigada de ${a.nombre}` : a.nombre;
}

/** "5 trabajos · 2 equipos · 1 cerrado". */
function resumen(p: Planificacion): string {
  const n = p.trabajos.length;
  const equipos = new Set(p.trabajos.map((t) => `${t.asignado.tipo}:${t.asignado.id}`)).size;
  const cerrados = p.trabajos.filter((t) => t.estado !== "planificado").length;
  return [
    `${n} trabajo${n === 1 ? "" : "s"}`,
    `${equipos} equipo${equipos === 1 ? "" : "s"}`,
    cerrados ? `${cerrados} cerrado${cerrados === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Los trabajos de un día, brigada por brigada. */
function porEquipo(trabajos: TrabajoPlanificado[]): [string, TrabajoPlanificado[]][] {
  const grupos = new Map<string, TrabajoPlanificado[]>();
  for (const t of trabajos) {
    const quien = nombreDe(t.asignado);
    grupos.set(quien, [...(grupos.get(quien) ?? []), t]);
  }
  return [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * Lo primero al entrar: las planificaciones que ya hay.
 *
 * Cada día se mira con el ojo, sin riesgo de tocar nada, o se cambia con el
 * lápiz. Un día nuevo se elige con el botón de arriba, en un calendario donde
 * los días que ya tienen trabajos llevan un punto verde.
 */
export function InicioPlanificacion({ hoy, onElegir, eligiendoDia, onEligiendoDia }: Props) {
  const [planes, setPlanes] = useState<Planificacion[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [viendo, setViendo] = useState<Planificacion | null>(null);

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
  const proximas = useMemo(
    () => conTrabajos.filter((p) => p.fecha.slice(0, 10) >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [conTrabajos, hoy],
  );
  const anteriores = useMemo(
    () =>
      conTrabajos
        .filter((p) => p.fecha.slice(0, 10) < hoy)
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .slice(0, 10),
    [conTrabajos, hoy],
  );

  function elegir(fecha: string) {
    onEligiendoDia(false);
    onElegir(fecha);
  }

  return (
    <div className="mx-auto max-w-3xl pt-2">
      <h2 className="text-2xl font-semibold text-gray-900">Planificaciones</h2>
      <p className="mt-1 text-sm text-gray-600">
        Mira o cambia un día ya planificado. Para uno nuevo, usa <span className="font-medium">Nueva</span>.
      </p>

      {planes === null ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Cargando…
        </p>
      ) : conTrabajos.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <p className="font-medium text-gray-900">
            {fallo ? "No se pudieron cargar las planificaciones." : "Todavía no hay ningún día planificado."}
          </p>
          {!fallo && (
            <Button className="mt-4" onClick={() => onEligiendoDia(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Planificar un día
            </Button>
          )}
        </div>
      ) : (
        <>
          <ListaPlanes titulo="Próximas" vacio="No hay nada planificado de hoy en adelante." planes={proximas} hoy={hoy} onVer={setViendo} onEditar={elegir} />
          {anteriores.length > 0 && (
            <ListaPlanes titulo="Anteriores" planes={anteriores} hoy={hoy} onVer={setViendo} onEditar={elegir} />
          )}
        </>
      )}

      <Dialog open={!!viendo} onOpenChange={(abierto) => !abierto && setViendo(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {viendo && (
            <>
              <DialogHeader>
                <DialogTitle className="first-letter:uppercase">{nombreDia(viendo.fecha.slice(0, 10), hoy)}</DialogTitle>
                <DialogDescription>{resumen(viendo)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                {porEquipo(viendo.trabajos).map(([quien, lista]) => (
                  <section key={quien}>
                    <h3 className="mb-2 text-sm font-semibold text-gray-900">{quien}</h3>
                    <ul className="space-y-2">
                      {lista.map((t, i) => (
                        <TarjetaTrabajo key={t.id || i} trabajo={t} reciente={false} mostrarQuien={false} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setViendo(null)}>
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    const fecha = viendo.fecha.slice(0, 10);
                    setViendo(null);
                    onElegir(fecha);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  Editar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={eligiendoDia} onOpenChange={onEligiendoDia}>
        <DialogContent className="w-auto max-w-fit">
          <DialogHeader>
            <DialogTitle>¿Qué día quieres planificar?</DialogTitle>
            <DialogDescription>Los días con punto verde ya tienen trabajos.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              locale={es}
              weekStartsOn={1}
              defaultMonth={aFecha(hoy)}
              onSelect={(d) => d && elegir(isoLocal(d))}
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
          </div>
          <div className="flex gap-2 border-t pt-3">
            {[
              { dias: 0, texto: "Hoy" },
              { dias: 1, texto: "Mañana" },
            ].map(({ dias, texto }) => (
              <button
                key={dias}
                type="button"
                onClick={() => elegir(desplazar(hoy, dias))}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListaPlanes({
  titulo,
  vacio,
  planes,
  hoy,
  onVer,
  onEditar,
}: {
  titulo: string;
  vacio?: string;
  planes: Planificacion[];
  hoy: string;
  onVer: (p: Planificacion) => void;
  onEditar: (fecha: string) => void;
}) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{titulo}</h3>
      {planes.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{vacio}</p>
      ) : (
        <ul className="mt-3 divide-y rounded-lg border bg-white">
          {planes.map((p) => {
            const fecha = p.fecha.slice(0, 10);
            const dia = nombreDia(fecha, hoy);
            return (
              <li key={fecha} className="flex items-center gap-1 py-2 pl-4 pr-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 first-letter:uppercase">{dia}</p>
                  <p className="text-xs text-gray-500">{resumen(p)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onVer(p)} aria-label={`Ver el plan de ${dia}`} title="Ver">
                  <Eye className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEditar(fecha)}
                  aria-label={`Editar el plan de ${dia}`}
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
