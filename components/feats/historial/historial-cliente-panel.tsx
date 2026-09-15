"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Loader2,
  MapPin,
  PackageOpen,
  Phone,
  RotateCcw,
  UserPlus,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { cn } from "@/lib/utils";
import { HistorialService } from "@/lib/services/feats/historial/historial-service";
import type {
  EventoHistorial,
  HistorialCliente,
  TipoEventoHistorial,
} from "@/lib/types/feats/historial/historial-types";

type Grupo = "ofertas" | "pagos" | "visitas" | "materiales" | "trabajos" | "averias" | "cliente";

const TIPOS: Record<TipoEventoHistorial, { grupo: Grupo; Icono: LucideIcon; tono: string }> = {
  cliente: { grupo: "cliente", Icono: UserPlus, tono: "bg-gray-100 text-gray-700" },
  oferta_creada: { grupo: "ofertas", Icono: FileText, tono: "bg-sky-50 text-sky-700" },
  oferta_confirmada: { grupo: "ofertas", Icono: BadgeCheck, tono: "bg-emerald-100 text-emerald-800" },
  pago: { grupo: "pagos", Icono: Banknote, tono: "bg-teal-50 text-teal-800" },
  visita: { grupo: "visitas", Icono: MapPin, tono: "bg-indigo-50 text-indigo-700" },
  vale: { grupo: "materiales", Icono: PackageOpen, tono: "bg-violet-50 text-violet-700" },
  devolucion: { grupo: "materiales", Icono: RotateCcw, tono: "bg-amber-50 text-amber-800" },
  trabajo_diario: { grupo: "trabajos", Icono: Wrench, tono: "bg-slate-100 text-slate-800" },
  averia: { grupo: "averias", Icono: AlertTriangle, tono: "bg-red-50 text-red-700" },
  averia_solucionada: { grupo: "averias", Icono: CheckCircle2, tono: "bg-emerald-50 text-emerald-700" },
};

const GRUPOS: { clave: Grupo; nombre: string }[] = [
  { clave: "ofertas", nombre: "Ofertas" },
  { clave: "pagos", nombre: "Pagos" },
  { clave: "visitas", nombre: "Visitas" },
  { clave: "materiales", nombre: "Materiales" },
  { clave: "trabajos", nombre: "Trabajos diarios" },
  { clave: "averias", nombre: "Averías" },
  { clave: "cliente", nombre: "Registro" },
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

interface Props {
  numero: string;
  /** En pantallas estrechas el historial ocupa la vista entera: vuelve a la lista. */
  onVolver: () => void;
  volverTexto: string;
}

/**
 * Todo lo que ha pasado con un cliente, en el orden en que pasó.
 *
 * Una línea de tiempo por días. Cada cosa con su icono y color para reconocerla
 * de un vistazo (ofertas, pagos, visitas, materiales, trabajos, averías) y los
 * filtros de arriba para quedarse solo con lo que se busca.
 */
export function HistorialClientePanel({ numero, onVolver, volverTexto }: Props) {
  const [datos, setDatos] = useState<HistorialCliente | null>(null);
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [ocultos, setOcultos] = useState<Set<Grupo>>(new Set());
  const [recientePrimero, setRecientePrimero] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setDatos(null);
    setError(false);
    HistorialService.cliente(numero)
      .then((d) => !cancelado && setDatos(d))
      .catch(() => !cancelado && setError(true));
    return () => {
      cancelado = true;
    };
  }, [numero, recarga]);

  const cuantos = useMemo(() => {
    const c = new Map<Grupo, number>();
    for (const e of datos?.eventos ?? []) c.set(TIPOS[e.tipo]?.grupo ?? "cliente", (c.get(TIPOS[e.tipo]?.grupo ?? "cliente") ?? 0) + 1);
    return c;
  }, [datos]);

  const dias = useMemo(() => {
    const visibles = (datos?.eventos ?? []).filter((e) => !ocultos.has(TIPOS[e.tipo]?.grupo ?? "cliente"));
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

  const volver = (
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
        <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white py-16 text-center">
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
      <header className="rounded-lg border border-gray-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-900">{c.nombre || c.numero}</h2>
          {c.estado && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">{c.estado}</span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-600">
          {[c.numero, c.municipio, c.provincia].filter(Boolean).join(" · ")}
        </p>
        {c.direccion && <p className="text-sm text-gray-600">{c.direccion}</p>}
        {c.telefono && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
            <Phone className="h-3.5 w-3.5" aria-hidden />
            {c.telefono}
          </p>
        )}
        <p className="mt-2 text-sm text-gray-700">
          <strong className="font-semibold text-gray-900">{datos.eventos.length}</strong>{" "}
          {datos.eventos.length === 1 ? "cosa registrada" : "cosas registradas"}
          {primero && <> desde el {nombreDelDia(primero.slice(0, 10))}</>}
        </p>
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
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                activo
                  ? "border-emerald-700 bg-emerald-700 font-medium text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:border-gray-400",
              )}
            >
              {g.nombre} <span className="tabular-nums opacity-80">{cuantos.get(g.clave)}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setRecientePrimero((v) => !v)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <ArrowDownUp className="h-4 w-4" aria-hidden />
          {recientePrimero ? "Lo más reciente primero" : "Lo más antiguo primero"}
        </button>
      </div>

      {dias.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-600">
          {datos.eventos.length === 0 ? "Todavía no hay nada registrado de este cliente." : "Nada con esos filtros."}
        </p>
      ) : (
        <ol className="mt-5 space-y-6">
          {dias.map(({ dia, eventos }) => (
            <li key={dia}>
              <h3 className="sticky top-16 z-10 mb-3 inline-block rounded-md bg-gray-50/95 pr-2 text-sm font-semibold capitalize text-gray-900 backdrop-blur">
                {dia === "sin-fecha" ? "Sin fecha" : nombreDelDia(dia)}
              </h3>
              <ol>
                {eventos.map((e, i) => (
                  <Evento key={`${e.tipo}-${e.fecha}-${i}`} evento={e} ultimo={i === eventos.length - 1} />
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Evento({ evento: e, ultimo }: { evento: EventoHistorial; ultimo: boolean }) {
  const { Icono, tono } = TIPOS[e.tipo] ?? TIPOS.cliente;
  const hora = e.fecha && !e.solo_dia ? e.fecha.slice(11, 16) : null;
  return (
    <li className="relative flex gap-3 pb-4">
      {!ultimo && <span className="absolute bottom-0 left-[17px] top-10 w-px bg-gray-200" aria-hidden />}
      <span className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tono)}>
        <Icono className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="font-semibold text-gray-900">{e.titulo}</p>
          {hora && <span className="text-xs tabular-nums text-gray-500">{hora}</span>}
          {e.estado && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{e.estado}</span>
          )}
        </div>
        {e.detalle && <p className="mt-0.5 whitespace-pre-line text-sm text-gray-800">{e.detalle}</p>}
        {e.lineas.map((l, i) => (
          <p key={i} className="text-sm text-gray-600">
            {l}
          </p>
        ))}
        {e.materiales.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-medium text-emerald-800 hover:underline">
              {e.materiales.length} {e.materiales.length === 1 ? "material" : "materiales"}
            </summary>
            <ul className="mt-2 divide-y divide-gray-100 text-sm">
              {e.materiales.map((m, i) => (
                <li key={i} className="flex justify-between gap-4 py-1">
                  <span className="min-w-0 text-gray-800">{m.nombre}</span>
                  <span className="shrink-0 tabular-nums font-medium text-gray-900">
                    {cantidad(m.cantidad)}
                    {m.um ? ` ${m.um}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </li>
  );
}
