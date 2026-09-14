"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  PlugZap,
  Plus,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EtiquetaTipo } from "@/components/feats/planificacion/tipo-trabajo";
import type { TipoTrabajo, TrabajoPlanificado } from "@/lib/types/feats/planificacion/planificacion-types";

const OPCIONES: {
  tipo: TipoTrabajo;
  titulo: string;
  descripcion: string;
  Icono: LucideIcon;
  tono: string;
}[] = [
  {
    tipo: "visita",
    titulo: "Visitas",
    descripcion: "Pendientes de visita",
    Icono: ClipboardCheck,
    tono: "bg-blue-50 text-blue-700",
  },
  {
    tipo: "instalacion_nueva",
    titulo: "Instalaciones nuevas",
    descripcion: "Pendientes de instalación",
    Icono: PlugZap,
    tono: "bg-emerald-50 text-emerald-800",
  },
  {
    tipo: "instalacion_en_proceso",
    titulo: "Instalaciones en proceso",
    descripcion: "Ya empezaron",
    Icono: Wrench,
    tono: "bg-teal-50 text-teal-800",
  },
  {
    tipo: "averia",
    titulo: "Averías",
    descripcion: "Sin resolver",
    Icono: AlertTriangle,
    tono: "bg-red-50 text-red-700",
  },
];

interface Props {
  /** "Mañana, martes 15 de septiembre". */
  titulo: string;
  cargando: boolean;
  trabajos: TrabajoPlanificado[];
  /** Ids de lo que se acaba de añadir, para resaltarlo. */
  recientes: Set<string>;
  onCambiarDia: () => void;
  onNuevo: () => void;
  onTipo: (tipo: TipoTrabajo) => void;
  onVerPlan: () => void;
  onQuitar: (trabajo: TrabajoPlanificado) => void;
}

/**
 * El día elegido: lo que ya tiene y cómo añadir más.
 *
 * El + de arriba añade un trabajo a mano. Lo añadido aparece enseguida en la
 * lista, lo último primero y resaltado un momento. Debajo, las listas de
 * pendientes para quien prefiera elegir de ahí.
 */
export function MenuDia({
  titulo,
  cargando,
  trabajos,
  recientes,
  onCambiarDia,
  onNuevo,
  onTipo,
  onVerPlan,
  onQuitar,
}: Props) {
  // Lo último que se añadió, arriba.
  const orden = [...trabajos].reverse();

  return (
    <div className="mx-auto max-w-3xl pt-2">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onCambiarDia}
            className="inline-flex items-center gap-1 rounded text-sm font-medium text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Elegir otro día
          </button>
          <h2 className="mt-1 text-2xl font-semibold text-gray-900">{titulo}</h2>
        </div>
        <button
          type="button"
          onClick={onNuevo}
          disabled={cargando}
          aria-label="Añadir un trabajo"
          title="Añadir un trabajo"
          className={cn(
            "mt-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white shadow-md transition-colors",
            "hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
            "disabled:cursor-wait disabled:opacity-60",
          )}
        >
          <Plus className="h-6 w-6" aria-hidden />
        </button>
      </div>

      <section className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">
            Trabajos de este día
            {!cargando && trabajos.length > 0 && (
              <span className="font-normal text-gray-500"> · {trabajos.length}</span>
            )}
          </h3>
          {!cargando && trabajos.length > 0 && (
            <button
              type="button"
              onClick={onVerPlan}
              className="rounded text-sm font-medium text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              Ver por brigadas
            </button>
          )}
        </div>

        {cargando ? (
          <p className="flex items-center gap-2 rounded-lg border bg-white px-4 py-6 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando el plan…
          </p>
        ) : trabajos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-600">
            Todavía no hay trabajos. Toca{" "}
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 align-middle text-white">
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </span>{" "}
            arriba para añadir uno, o elígelos de las listas de abajo.
          </div>
        ) : (
          <ul className="space-y-2">
            {orden.map((t) => {
              const abierto = t.estado === "planificado";
              const reciente = recientes.has(t.id);
              return (
                <li
                  key={t.id || `${t.tipo}-${t.cliente_numero ?? t.lead_id}`}
                  className={cn(
                    "flex gap-3 rounded-lg border px-4 py-3 transition-colors duration-700",
                    reciente ? "border-emerald-600 bg-emerald-50" : "border-gray-200 bg-white",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <EtiquetaTipo tipo={t.tipo} />
                      {reciente && <span className="text-xs font-semibold text-emerald-800">Añadido</span>}
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
                    <p className="mt-1 text-sm font-semibold text-gray-900">{t.nombre || "Sin nombre"}</p>
                    {t.direccion && <p className="text-xs text-gray-500">{t.direccion}</p>}
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-700">
                      <Users className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                      {t.asignado.tipo === "brigada" ? `Brigada de ${t.asignado.nombre}` : t.asignado.nombre}
                    </p>
                    {t.nota && <p className="mt-1 text-xs text-gray-700">Nota: {t.nota}</p>}
                  </div>
                  {abierto && (
                    <button
                      type="button"
                      onClick={() => onQuitar(t)}
                      aria-label={`Quitar ${t.nombre} del plan`}
                      title="Quitar del plan"
                      className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <h3 className="mt-10 text-base font-semibold text-gray-900">O elige de las listas de pendientes</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {OPCIONES.map(({ tipo, titulo: nombre, descripcion, Icono, tono }) => (
          <button
            key={tipo}
            type="button"
            disabled={cargando}
            onClick={() => onTipo(tipo)}
            className={cn(
              "group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-colors",
              "hover:border-emerald-600 hover:shadow",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
              "disabled:cursor-wait disabled:opacity-60",
            )}
          >
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tono)}>
              <Icono className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900">{nombre}</span>
              <span className="block text-xs text-gray-600">{descripcion}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-emerald-700" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
