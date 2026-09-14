"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  PlugZap,
  Plus,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { cn } from "@/lib/utils";
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
    descripcion: "Clientes y leads pendientes de visita",
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
    descripcion: "Instalaciones que ya empezaron",
    Icono: Wrench,
    tono: "bg-teal-50 text-teal-800",
  },
  {
    tipo: "averia",
    titulo: "Averías",
    descripcion: "Clientes con averías sin resolver",
    Icono: AlertTriangle,
    tono: "bg-red-50 text-red-700",
  },
];

interface Props {
  /** "Mañana, martes 15 de septiembre". */
  titulo: string;
  cargando: boolean;
  trabajos: TrabajoPlanificado[];
  onCambiarDia: () => void;
  onTipo: (tipo: TipoTrabajo) => void;
  onVerPlan: () => void;
  onNuevo: () => void;
}

/**
 * El día elegido: cuánto lleva y qué se quiere planificar.
 *
 * Cuatro botones grandes, uno por tipo de trabajo. No se carga ninguna lista
 * hasta que se toca uno: entrar tiene que ser instantáneo.
 */
export function MenuDia({ titulo, cargando, trabajos, onCambiarDia, onTipo, onVerPlan, onNuevo }: Props) {
  const quienes = new Set(trabajos.map((t) => `${t.asignado.tipo}:${t.asignado.id}`)).size;

  return (
    <div className="mx-auto max-w-3xl pt-2">
      <button
        type="button"
        onClick={onCambiarDia}
        className="inline-flex items-center gap-1 rounded text-sm font-medium text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Elegir otro día
      </button>
      <h2 className="mt-1 text-2xl font-semibold text-gray-900">{titulo}</h2>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border bg-white px-4 py-3">
        <p className="min-w-0 flex-1 text-sm text-gray-700">
          {cargando ? (
            <span className="inline-flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Cargando el plan…
            </span>
          ) : trabajos.length === 0 ? (
            "Todavía no hay nada planificado para este día."
          ) : (
            <>
              <strong className="font-semibold text-gray-900">
                {trabajos.length} trabajo{trabajos.length === 1 ? "" : "s"}
              </strong>{" "}
              planificado{trabajos.length === 1 ? "" : "s"}, con {quienes}{" "}
              {quienes === 1 ? "brigada o persona" : "brigadas o personas"}.
            </>
          )}
        </p>
        {!cargando && trabajos.length > 0 && (
          <Button variant="outline" onClick={onVerPlan}>
            <ClipboardList className="mr-2 h-4 w-4" aria-hidden />
            Ver el plan del día
          </Button>
        )}
      </div>

      {/* Lo más directo: se sabe qué hay que hacer y a quién, y se pone. */}
      <button
        type="button"
        disabled={cargando}
        onClick={onNuevo}
        className={cn(
          "mt-6 flex w-full items-center gap-4 rounded-xl bg-emerald-800 p-4 text-left text-white shadow-sm transition-colors",
          "hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
          "disabled:cursor-wait disabled:opacity-60",
        )}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <Plus className="h-7 w-7" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold">Añadir un trabajo</span>
          <span className="block text-sm text-emerald-50">Elige el cliente, qué hay que hacer y quién va</span>
        </span>
      </button>

      <h3 className="mt-8 text-base font-semibold text-gray-900">O elige de las listas de pendientes</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {OPCIONES.map(({ tipo, titulo: nombre, descripcion, Icono, tono }) => {
          const enPlan = trabajos.filter((t) => t.tipo === tipo).length;
          return (
            <button
              key={tipo}
              type="button"
              disabled={cargando}
              onClick={() => onTipo(tipo)}
              className={cn(
                "group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors",
                "hover:border-emerald-600 hover:shadow",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                "disabled:cursor-wait disabled:opacity-60",
              )}
            >
              <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-lg", tono)}>
                <Icono className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-gray-900">{nombre}</span>
                <span className="block text-sm text-gray-600">{descripcion}</span>
                {!cargando && enPlan > 0 && (
                  <span className="mt-1 block text-xs font-medium text-emerald-800">
                    {enPlan} en el plan de este día
                  </span>
                )}
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-emerald-700" aria-hidden />
            </button>
          );
        })}
      </div>

    </div>
  );
}
