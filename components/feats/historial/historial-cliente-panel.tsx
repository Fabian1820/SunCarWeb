"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  PackageOpen,
  Phone,
  RotateCcw,
  UserPlus,
  Wrench,
  ArrowRightLeft,
  Ban,
  Banknote,
  CalendarClock,
  FilePen,
  FilePlus2,
  Megaphone,
  PencilLine,
  Trash2,
  Undo2,
  UserCog,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { cn } from "@/lib/utils";
import { HistorialService } from "@/lib/services/feats/historial/historial-service";
import type { EventoHistorial, HistorialCliente } from "@/lib/types/feats/historial/historial-types";

type Grupo = "comercial" | "ofertas" | "pagos" | "visitas" | "materiales" | "trabajos" | "averias" | "registro";

interface Tono {
  grupo: Grupo;
  Icono: LucideIcon;
  /** El círculo de la línea de tiempo. */
  nodo: string;
  /** Fondo y borde de la tarjeta. */
  tarjeta: string;
  /** Texto principal, del mismo tono que el fondo. */
  fuerte: string;
  /** Texto secundario, también del tono. */
  suave: string;
}

/** Cada tipo con su color: se reconoce por el fondo antes de leer nada. */
const TONOS: Record<string, Tono> = {
  cliente: {
    grupo: "registro",
    Icono: UserPlus,
    nodo: "bg-gray-700",
    tarjeta: "border-gray-200 bg-white",
    fuerte: "text-gray-900",
    suave: "text-gray-600",
  },
  lead: {
    grupo: "comercial",
    Icono: Megaphone,
    nodo: "bg-fuchsia-600",
    tarjeta: "border-fuchsia-200 bg-fuchsia-50",
    fuerte: "text-fuchsia-950",
    suave: "text-fuchsia-900",
  },
  cita: {
    grupo: "comercial",
    Icono: CalendarClock,
    nodo: "bg-pink-600",
    tarjeta: "border-pink-200 bg-pink-50",
    fuerte: "text-pink-950",
    suave: "text-pink-900",
  },
  cliente_cambio: {
    grupo: "comercial",
    Icono: UserCog,
    nodo: "bg-slate-600",
    tarjeta: "border-slate-200 bg-slate-50",
    fuerte: "text-slate-950",
    suave: "text-slate-700",
  },
  oferta_creada: {
    grupo: "ofertas",
    Icono: FilePlus2,
    nodo: "bg-emerald-800",
    tarjeta: "border-emerald-200 bg-white",
    fuerte: "text-emerald-950",
    suave: "text-emerald-900",
  },
  oferta_editada: {
    grupo: "ofertas",
    Icono: FilePen,
    nodo: "bg-emerald-500",
    tarjeta: "border-emerald-100 bg-white",
    fuerte: "text-emerald-950",
    suave: "text-emerald-900",
  },
  oferta_estado: {
    grupo: "ofertas",
    Icono: ArrowRightLeft,
    nodo: "bg-emerald-700",
    tarjeta: "border-emerald-200 bg-emerald-50",
    fuerte: "text-emerald-950",
    suave: "text-emerald-900",
  },
  oferta_cancelada: {
    grupo: "ofertas",
    Icono: XCircle,
    nodo: "bg-gray-500",
    tarjeta: "border-gray-200 bg-gray-100",
    fuerte: "text-gray-900",
    suave: "text-gray-700",
  },
  oferta_eliminada: {
    grupo: "ofertas",
    Icono: Trash2,
    nodo: "bg-gray-500",
    tarjeta: "border-gray-200 bg-gray-100",
    fuerte: "text-gray-900",
    suave: "text-gray-700",
  },
  pago: {
    grupo: "pagos",
    Icono: Banknote,
    nodo: "bg-cyan-700",
    tarjeta: "border-cyan-200 bg-cyan-50",
    fuerte: "text-cyan-950",
    suave: "text-cyan-900",
  },
  pago_editado: {
    grupo: "pagos",
    Icono: PencilLine,
    nodo: "bg-cyan-500",
    tarjeta: "border-cyan-100 bg-white",
    fuerte: "text-cyan-950",
    suave: "text-cyan-900",
  },
  pago_cancelado: {
    grupo: "pagos",
    Icono: Ban,
    nodo: "bg-gray-500",
    tarjeta: "border-gray-200 bg-gray-100",
    fuerte: "text-gray-900",
    suave: "text-gray-700",
  },
  devolucion_pago: {
    grupo: "pagos",
    Icono: Undo2,
    nodo: "bg-orange-600",
    tarjeta: "border-orange-200 bg-orange-50",
    fuerte: "text-orange-950",
    suave: "text-orange-900",
  },
  oferta_confirmada: {
    grupo: "ofertas",
    Icono: BadgeCheck,
    nodo: "bg-emerald-600",
    tarjeta: "border-emerald-200 bg-emerald-50",
    fuerte: "text-emerald-950",
    suave: "text-emerald-900",
  },
  visita: {
    grupo: "visitas",
    Icono: MapPin,
    nodo: "bg-indigo-600",
    tarjeta: "border-indigo-200 bg-indigo-50",
    fuerte: "text-indigo-950",
    suave: "text-indigo-900",
  },
  vale: {
    grupo: "materiales",
    Icono: PackageOpen,
    nodo: "bg-violet-600",
    tarjeta: "border-violet-200 bg-violet-50",
    fuerte: "text-violet-950",
    suave: "text-violet-900",
  },
  devolucion: {
    grupo: "materiales",
    Icono: RotateCcw,
    nodo: "bg-amber-600",
    tarjeta: "border-amber-200 bg-amber-50",
    fuerte: "text-amber-950",
    suave: "text-amber-900",
  },
  trabajo_diario: {
    grupo: "trabajos",
    Icono: Wrench,
    nodo: "bg-sky-700",
    tarjeta: "border-sky-200 bg-sky-50",
    fuerte: "text-sky-950",
    suave: "text-sky-900",
  },
  averia: {
    grupo: "averias",
    Icono: AlertTriangle,
    nodo: "bg-red-600",
    tarjeta: "border-red-200 bg-red-50",
    fuerte: "text-red-950",
    suave: "text-red-900",
  },
  averia_solucionada: {
    grupo: "averias",
    Icono: CheckCircle2,
    nodo: "bg-teal-600",
    tarjeta: "border-teal-200 bg-teal-50",
    fuerte: "text-teal-950",
    suave: "text-teal-900",
  },
};

const tonoDe = (tipo: string | undefined): Tono => (tipo && TONOS[tipo]) || TONOS.cliente;

const GRUPOS: { clave: Grupo; nombre: string; punto: string }[] = [
  { clave: "comercial", nombre: "Comercial", punto: "bg-fuchsia-600" },
  { clave: "ofertas", nombre: "Ofertas", punto: "bg-emerald-600" },
  { clave: "pagos", nombre: "Pagos", punto: "bg-cyan-700" },
  { clave: "visitas", nombre: "Visitas", punto: "bg-indigo-600" },
  { clave: "materiales", nombre: "Materiales", punto: "bg-violet-600" },
  { clave: "trabajos", nombre: "Trabajos diarios", punto: "bg-sky-700" },
  { clave: "averias", nombre: "Averías", punto: "bg-red-600" },
  { clave: "registro", nombre: "Registro", punto: "bg-gray-700" },
];

function nombreDelDia(dia: string): string {
  const d = new Date(`${dia}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? dia
    : d.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

function cantidad(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString("es", { maximumFractionDigits: 2 });
}

export function iniciales(nombre: string): string {
  return (
    nombre
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

interface Props {
  numero: string;
  /** "comercial" suma lo de comercial: de dónde vino, ofertas y sus cambios, pagos, citas. */
  vista?: "operaciones" | "comercial";
  /** Dentro de un diálogo: sin botón de volver y con los días pegados bajo su cabecera. */
  enDialogo?: boolean;
  /** En pantallas estrechas el historial ocupa la vista entera: vuelve a la lista. */
  onVolver: () => void;
  volverTexto: string;
}

/**
 * Lo que ha pasado con un cliente en operaciones, en el orden en que pasó.
 *
 * Una línea de tiempo por días donde cada tipo tiene su color de fondo, y cada
 * cosa enlaza con las que tienen que ver con ella: el vale con el trabajo que
 * usó sus materiales, la avería con el trabajo que la solucionó. Tocar un enlace
 * lleva hasta ese momento y lo marca.
 */
export function HistorialClientePanel({ numero, vista = "operaciones", enDialogo = false, onVolver, volverTexto }: Props) {
  const [datos, setDatos] = useState<HistorialCliente | null>(null);
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [ocultos, setOcultos] = useState<Set<Grupo>>(new Set());
  const [recientePrimero, setRecientePrimero] = useState(false);
  const [resaltado, setResaltado] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setDatos(null);
    setError(false);
    setOcultos(new Set());
    HistorialService.cliente(numero, vista)
      .then((d) => !cancelado && setDatos(d))
      .catch(() => !cancelado && setError(true));
    return () => {
      cancelado = true;
    };
  }, [numero, recarga, vista]);

  useEffect(() => {
    if (!resaltado) return;
    const id = setTimeout(() => setResaltado(null), 2400);
    return () => clearTimeout(id);
  }, [resaltado]);

  const tipoPorId = useMemo(() => new Map((datos?.eventos ?? []).map((e) => [e.id, e.tipo])), [datos]);

  const cuantos = useMemo(() => {
    const c = new Map<Grupo, number>();
    for (const e of datos?.eventos ?? []) {
      const g = tonoDe(e.tipo).grupo;
      c.set(g, (c.get(g) ?? 0) + 1);
    }
    return c;
  }, [datos]);

  const dias = useMemo(() => {
    const visibles = (datos?.eventos ?? []).filter((e) => !ocultos.has(tonoDe(e.tipo).grupo));
    const ordenados = recientePrimero ? [...visibles].reverse() : visibles;
    const grupos: { dia: string; eventos: EventoHistorial[] }[] = [];
    for (const e of ordenados) {
      const dia = e.fecha ? e.fecha.slice(0, 10) : "sin-fecha";
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.dia === dia) ultimo.eventos.push(e);
      else grupos.push({ dia, eventos: [e] });
    }
    return grupos;
  }, [datos, ocultos, recientePrimero]);

  function alternar(grupo: Grupo) {
    setOcultos((previos) => {
      const nuevos = new Set(previos);
      if (nuevos.has(grupo)) nuevos.delete(grupo);
      else nuevos.add(grupo);
      return nuevos;
    });
  }

  function irA(id: string) {
    const grupo = tonoDe(tipoPorId.get(id)).grupo;
    setOcultos((previos) => {
      if (!previos.has(grupo)) return previos;
      const nuevos = new Set(previos);
      nuevos.delete(grupo);
      return nuevos;
    });
    setResaltado(id);
    // Dos cuadros: el primero muestra el grupo si estaba oculto, el segundo ya lo encuentra.
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.getElementById(`evento-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
      ),
    );
  }

  const volver = enDialogo ? null : (
    <button
      type="button"
      onClick={onVolver}
      className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline lg:hidden"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      {volverTexto}
    </button>
  );

  if (error) {
    return (
      <div>
        {volver}
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-16 text-center">
          <p className="font-medium text-gray-900">No se pudo cargar el historial</p>
          <Button onClick={() => setRecarga((n) => n + 1)}>Reintentar</Button>
        </div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div>
        {volver}
        <p className="flex items-center gap-2 py-16 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Cargando el historial…
        </p>
      </div>
    );
  }

  const c = datos.cliente;
  const primero = datos.eventos.find((e) => e.fecha)?.fecha;

  return (
    <div>
      {volver}
      <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-base font-semibold text-white">
            {iniciales(c.nombre || c.numero)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">{c.nombre || c.numero}</h2>
              {c.estado && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">{c.estado}</span>
              )}
            </div>
            <p className="text-sm text-gray-600">{[c.numero, c.municipio, c.provincia].filter(Boolean).join(" · ")}</p>
            {c.direccion && <p className="text-sm text-gray-600">{c.direccion}</p>}
            {c.telefono && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-700">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {c.telefono}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-700">
              <strong className="font-semibold text-gray-900">{datos.eventos.length}</strong>{" "}
              {datos.eventos.length === 1 ? "cosa registrada" : "cosas registradas"}
              {primero && <> desde el {nombreDelDia(primero.slice(0, 10))}</>}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {GRUPOS.filter((g) => (cuantos.get(g.clave) ?? 0) > 0).map((g) => {
          const activo = !ocultos.has(g.clave);
          return (
            <button
              key={g.clave}
              type="button"
              aria-pressed={activo}
              onClick={() => alternar(g.clave)}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                activo
                  ? "border-gray-300 bg-white font-medium text-gray-900 shadow-sm"
                  : "border-dashed border-gray-300 text-gray-500 line-through",
              )}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", g.punto, !activo && "opacity-40")} aria-hidden />
              {g.nombre}
              <span className="tabular-nums text-gray-500 no-underline">{cuantos.get(g.clave)}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setRecientePrimero((v) => !v)}
          className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <ArrowDownUp className="h-4 w-4" aria-hidden />
          {recientePrimero ? "Lo más reciente primero" : "Lo más antiguo primero"}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-gray-500">Toca un tipo para ocultarlo o volver a verlo.</p>

      {dias.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-600">
          {datos.eventos.length === 0 ? "Todavía no hay nada registrado de este cliente." : "Nada con esos filtros."}
        </p>
      ) : (
        <ol className="mt-6">
          {dias.map(({ dia, eventos }) => (
            <li key={dia} className="mb-3">
              <div className={cn("sticky z-10 mb-3 flex items-center gap-2 bg-gray-50 py-1", enDialogo ? "top-[5.5rem]" : "top-16")}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold capitalize text-white">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  {dia === "sin-fecha" ? "Sin fecha" : nombreDelDia(dia)}
                </span>
                <span className="h-px flex-1 bg-gray-200" aria-hidden />
              </div>
              <ol className="ml-[18px] border-l-2 border-gray-200 pl-7">
                {eventos.map((e) => (
                  <Evento key={e.id} evento={e} resaltado={resaltado === e.id} tipoPorId={tipoPorId} onIr={irA} />
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Evento({
  evento: e,
  resaltado,
  tipoPorId,
  onIr,
}: {
  evento: EventoHistorial;
  resaltado: boolean;
  tipoPorId: Map<string, string>;
  onIr: (id: string) => void;
}) {
  const t = tonoDe(e.tipo);
  const hora = e.fecha && !e.solo_dia ? e.fecha.slice(11, 16) : null;
  return (
    <li id={`evento-${e.id}`} className="relative mb-4 scroll-mt-32">
      <span
        className={cn(
          "absolute -left-[47px] top-2.5 flex h-9 w-9 items-center justify-center rounded-full text-white ring-4 ring-gray-50",
          t.nodo,
        )}
        aria-hidden
      >
        <t.Icono className="h-4 w-4" />
      </span>
      <div
        className={cn(
          "rounded-xl border px-4 py-3 transition-shadow duration-300",
          t.tarjeta,
          resaltado && "shadow-lg ring-2 ring-gray-900 ring-offset-2 ring-offset-gray-50",
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className={cn("font-semibold", t.fuerte)}>{e.titulo}</p>
          {hora && <span className={cn("text-xs tabular-nums", t.suave)}>{hora}</span>}
        </div>
        {e.estado && (
          <span className={cn("mt-1 inline-block rounded-full bg-white px-2 py-0.5 text-xs font-semibold", t.fuerte)}>
            {e.estado}
          </span>
        )}
        {e.detalle && <p className={cn("mt-0.5 whitespace-pre-line text-sm font-medium", t.fuerte)}>{e.detalle}</p>}
        {e.lineas.map((l, i) => (
          <p key={i} className={cn("text-sm", t.suave)}>
            {l}
          </p>
        ))}
        {e.materiales.length > 0 && (
          <details className="group mt-2">
            <summary className={cn("cursor-pointer text-sm font-semibold hover:underline", t.fuerte)}>
              {e.materiales.length} {e.materiales.length === 1 ? "material" : "materiales"}
            </summary>
            <ul className="mt-2 space-y-1 text-sm">
              {e.materiales.map((m, i) => (
                <li key={i} className="flex justify-between gap-4 rounded-md bg-white px-3 py-1.5">
                  <span className="min-w-0 text-gray-900">{m.nombre}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-gray-900">
                    {cantidad(m.cantidad)}
                    {m.um ? ` ${m.um}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {e.enlaces.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-black/5 pt-2.5">
            {e.enlaces.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onIr(l.id)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white px-2.5 text-xs font-semibold text-gray-900 ring-1 ring-black/10 transition hover:ring-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <span className={cn("h-2 w-2 rounded-full", tonoDe(tipoPorId.get(l.id)).nodo)} aria-hidden />
                {l.texto}
                <ChevronRight className="h-3.5 w-3.5 text-gray-500" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
