"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  List,
  Loader2,
  Pencil,
  PlugZap,
  Plus,
  RefreshCw,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/shared/molecule/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shared/molecule/popover";
import { cn } from "@/lib/utils";
import { EtiquetaTipo } from "@/components/feats/planificacion/tipo-trabajo";
import { aFecha, fechaCorta, isoLocal } from "@/components/feats/planificacion/fechas";
import type {
  Asignado,
  TipoTrabajo,
  TrabajoPlanificado,
} from "@/lib/types/feats/planificacion/planificacion-types";

const OPCIONES: {
  tipo: TipoTrabajo;
  titulo: string;
  descripcion: string;
  Icono: LucideIcon;
  tono: string;
}[] = [
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
  // Sin lista de pendientes: ningún estado dice a quién toca actualizar, así
  // que abre "Añadir un trabajo" con el tipo ya puesto.
  {
    tipo: "actualizacion",
    titulo: "Actualizaciones",
    descripcion: "Añade el cliente a actualizar",
    Icono: RefreshCw,
    tono: "bg-sky-50 text-sky-700",
  },
];

type VistaPlan = "lista" | "brigadas";
const CLAVE_VISTA = "planificacion:vista-plan";

function nombreDe(a: Asignado): string {
  return a.tipo === "brigada" ? `Brigada de ${a.nombre}` : a.nombre;
}

interface Props {
  /** "YYYY-MM-DD" del día que se planifica. */
  fecha: string;
  hoy: string;
  cargando: boolean;
  trabajos: TrabajoPlanificado[];
  /** Ids de lo que se acaba de añadir, para resaltarlo. */
  recientes: Set<string>;
  onCambiarFecha: (fecha: string) => void;
  onNuevo: () => void;
  onTipo: (tipo: TipoTrabajo) => void;
  onQuitar: (trabajo: TrabajoPlanificado) => void;
}

/**
 * El día elegido: su plan y cómo añadir más.
 *
 * Arriba, la fecha en corto con su lápiz para cambiarla y el + para añadir.
 * El plan se ve en lista (lo último añadido primero) o agrupado por brigada.
 * Debajo, las listas de pendientes para quien prefiera elegir de ahí.
 */
export function MenuDia({
  fecha,
  hoy,
  cargando,
  trabajos,
  recientes,
  onCambiarFecha,
  onNuevo,
  onTipo,
  onQuitar,
}: Props) {
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [vista, setVista] = useState<VistaPlan>("lista");

  useEffect(() => {
    try {
      const guardada = localStorage.getItem(CLAVE_VISTA);
      if (guardada === "lista" || guardada === "brigadas") setVista(guardada);
    } catch {
      /* sin almacenamiento, en lista */
    }
  }, []);

  function cambiarVista(v: VistaPlan) {
    setVista(v);
    try {
      localStorage.setItem(CLAVE_VISTA, v);
    } catch {
      /* no pasa nada */
    }
  }

  // Lo último que se añadió, arriba.
  const orden = useMemo(() => [...trabajos].reverse(), [trabajos]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, { asignado: Asignado; trabajos: TrabajoPlanificado[] }>();
    for (const t of trabajos) {
      const clave = `${t.asignado.tipo}:${t.asignado.id}`;
      if (!mapa.has(clave)) mapa.set(clave, { asignado: t.asignado, trabajos: [] });
      mapa.get(clave)!.trabajos.push(t);
    }
    return [...mapa.values()].sort((a, b) => nombreDe(a.asignado).localeCompare(nombreDe(b.asignado)));
  }, [trabajos]);

  return (
    <div className="mx-auto max-w-3xl pt-2">
      {/* La fecha en corto, su lápiz y el + a la derecha. */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-gray-900">{fechaCorta(fecha, hoy)}</span>
        <Popover open={calendarioAbierto} onOpenChange={setCalendarioAbierto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Cambiar el día"
              title="Cambiar el día"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:border-emerald-600 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              locale={es}
              weekStartsOn={1}
              selected={aFecha(fecha)}
              defaultMonth={aFecha(fecha)}
              onSelect={(d) => {
                if (!d) return;
                setCalendarioAbierto(false);
                onCambiarFecha(isoLocal(d));
              }}
            />
          </PopoverContent>
        </Popover>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onNuevo}
          disabled={cargando}
          aria-label="Añadir un trabajo"
          title="Añadir un trabajo"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white shadow-md transition-colors",
            "hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
            "disabled:cursor-wait disabled:opacity-60",
          )}
        >
          <Plus className="h-6 w-6" aria-hidden />
        </button>
      </div>

      <section className="mt-5">
        <div className="mb-2 flex h-9 items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            Plan
            {!cargando && trabajos.length > 0 && (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-800">
                {trabajos.length}
              </span>
            )}
          </h3>
          {!cargando && trabajos.length > 0 && (
            <div className="inline-flex rounded-lg bg-gray-200/70 p-0.5" role="radiogroup" aria-label="Cómo ver el plan">
              {(
                [
                  ["lista", "Lista", List],
                  ["brigadas", "Brigadas", Users],
                ] as const
              ).map(([v, texto, Icono]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={vista === v}
                  onClick={() => cambiarVista(v)}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                    vista === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900",
                  )}
                >
                  <Icono className="h-4 w-4" aria-hidden />
                  {texto}
                </button>
              ))}
            </div>
          )}
        </div>

        {cargando ? (
          <p className="flex items-center gap-2 rounded-lg border bg-white px-4 py-6 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando el plan…
          </p>
        ) : trabajos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-600">
            Todavía no hay nada. Toca{" "}
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 align-middle text-white">
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </span>{" "}
            para añadir un trabajo, o elígelos de las listas de abajo.
          </div>
        ) : vista === "lista" ? (
          <ul className="space-y-2">
            {orden.map((t) => (
              <TarjetaTrabajo
                key={t.id || `${t.tipo}-${t.cliente_numero ?? t.lead_id}`}
                trabajo={t}
                reciente={recientes.has(t.id)}
                mostrarQuien
                onQuitar={() => onQuitar(t)}
              />
            ))}
          </ul>
        ) : (
          <div className="space-y-4">
            {grupos.map((g) => (
              <div key={`${g.asignado.tipo}:${g.asignado.id}`}>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {nombreDe(g.asignado)}
                  <span className="font-normal normal-case tracking-normal text-gray-500">· {g.trabajos.length}</span>
                </p>
                <ul className="space-y-2">
                  {g.trabajos.map((t) => (
                    <TarjetaTrabajo
                      key={t.id || `${t.tipo}-${t.cliente_numero ?? t.lead_id}`}
                      trabajo={t}
                      reciente={recientes.has(t.id)}
                      mostrarQuien={false}
                      onQuitar={() => onQuitar(t)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
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

/** Un trabajo del plan: qué, a quién, dónde, quién va y la nota. Sin onQuitar, solo se mira. */
export function TarjetaTrabajo({
  trabajo: t,
  reciente,
  mostrarQuien,
  onQuitar,
}: {
  trabajo: TrabajoPlanificado;
  reciente: boolean;
  mostrarQuien: boolean;
  onQuitar?: () => void;
}) {
  const abierto = t.estado === "planificado";
  return (
    <li
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
              className={cn("text-xs font-semibold", t.estado === "cumplido" ? "text-emerald-800" : "text-red-700")}
            >
              {t.estado === "cumplido" ? "Cumplido" : "No realizado"}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm font-semibold text-gray-900">{t.nombre || "Sin nombre"}</p>
        {t.direccion && <p className="text-xs text-gray-500">{t.direccion}</p>}
        {mostrarQuien && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-700">
            <Users className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
            {nombreDe(t.asignado)}
          </p>
        )}
        {(t.oferta_nombre || t.oferta_numero) && (
          <p className="mt-1 text-xs font-medium text-emerald-800">
            Se instala: {t.oferta_nombre || t.oferta_numero}
            {t.oferta_nombre && t.oferta_numero ? ` (${t.oferta_numero})` : ""}
          </p>
        )}
        {t.nota && <p className="mt-1 text-xs text-gray-700">Nota: {t.nota}</p>}
      </div>
      {abierto && onQuitar && (
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar ${t.nombre} del plan`}
          title="Quitar del plan"
          className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </li>
  );
}
