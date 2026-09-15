"use client";

import { useEffect, useMemo, useState } from "react";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PackageCheck,
  RotateCcw,
  Search,
} from "lucide-react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { RouteGuard } from "@/components/auth/route-guard";
import { Button } from "@/components/shared/atom/button";
import { Calendar } from "@/components/shared/molecule/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shared/molecule/popover";
import { cn } from "@/lib/utils";
import { aFecha, desplazar, esFechaIso, isoLocal, nombreDia } from "@/components/feats/planificacion/fechas";
import { EntregasDevolucionesService } from "@/lib/services/feats/entregas-devoluciones/entregas-devoluciones-service";
import type {
  DevolucionOtroDia,
  DevolucionRegistrada,
  EntregaDelDia,
  EntregasDelDia,
  MaterialEntregado,
} from "@/lib/types/feats/entregas-devoluciones/entregas-devoluciones-types";

const ZONA = "America/Havana";

const CLASE_CAMPO =
  "h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";

export default function EntregasDevolucionesPage() {
  return (
    <RouteGuard requiredModule="entregas-devoluciones">
      <EntregasDevoluciones />
    </RouteGuard>
  );
}

function hora(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", timeZone: ZONA });
}

function diaYHora(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: ZONA });
}

function soloDia(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("es", { day: "numeric", month: "short", timeZone: ZONA });
}

function cantidad(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString("es", { maximumFractionDigits: 2 });
}

function nombreMaterial(m: { material_descripcion?: string | null; material_codigo?: string | null; material_id: string }) {
  return m.material_descripcion || m.material_codigo || m.material_id;
}

/**
 * Entregas y devoluciones: lo que sale del almacén cada día.
 *
 * Una fila por vale, en el orden en que salieron, con a quién se le dio y quién
 * lo recogió. Al abrirla, sus materiales con lo devuelto de cada uno y cada
 * devolución. Las devoluciones de ese día de vales que salieron antes van al
 * final, aparte, para que no se pierdan.
 */
function EntregasDevoluciones() {
  const hoy = useMemo(() => isoLocal(new Date()), []);
  const [fecha, setFecha] = useState(hoy);
  const [datos, setDatos] = useState<EntregasDelDia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [almacen, setAlmacen] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [verAnulados, setVerAnulados] = useState(false);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);

  // El día vive en la dirección (?dia=…): recargar o compartir el enlace no lo pierde.
  useEffect(() => {
    const dia = new URLSearchParams(window.location.search).get("dia");
    if (dia && esFechaIso(dia)) setFecha(dia);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (fecha === hoy) url.searchParams.delete("dia");
    else url.searchParams.set("dia", fecha);
    window.history.replaceState(null, "", url.toString());
  }, [fecha, hoy]);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(false);
    EntregasDevolucionesService.delDia(fecha)
      .then((d) => {
        if (cancelado) return;
        setDatos(d);
        setAbiertas(new Set());
      })
      .catch(() => !cancelado && setError(true))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [fecha, recarga]);

  const texto = busqueda.trim().toLowerCase();
  const coincide = (...campos: (string | null | undefined)[]) =>
    !texto || campos.some((c) => (c ?? "").toLowerCase().includes(texto));

  const delAlmacen = (datos?.entregas ?? []).filter((e) => !almacen || e.almacen_id === almacen);
  const anulados = delAlmacen.filter((e) => e.estado === "anulado").length;
  const entregas = delAlmacen.filter(
    (e) =>
      (verAnulados || e.estado !== "anulado") &&
      coincide(e.cliente_nombre, e.cliente_numero, e.codigo, e.solicitud_codigo, e.recogido_por),
  );
  const otras = (datos?.devoluciones_otros_dias ?? []).filter(
    (d) =>
      (!almacen || d.vale.almacen_id === almacen) &&
      coincide(d.vale.cliente_nombre, d.vale.cliente_numero, d.vale.codigo, d.responsable),
  );
  const activas = entregas.filter((e) => e.estado !== "anulado");
  const clientes = new Set(activas.map((e) => e.cliente_numero || e.cliente_nombre).filter(Boolean)).size;
  const conDevolucion = activas.filter((e) => e.devoluciones.length > 0).length;

  function alternar(id: string) {
    setAbiertas((previas) => {
      const nuevas = new Set(previas);
      if (nuevas.has(id)) nuevas.delete(id);
      else nuevas.add(id);
      return nuevas;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader title="Entregas y devoluciones" subtitle="Lo que sale del almacén cada día, a quién y qué se devolvió" />

      <main className="content-with-fixed-header mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="flex items-stretch overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setFecha(desplazar(fecha, -1))}
              aria-label="Día anterior"
              className="flex w-11 items-center justify-center text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <Popover open={calendarioAbierto} onOpenChange={setCalendarioAbierto}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-[16rem] items-center justify-center gap-2 border-x border-gray-200 px-4 py-2 text-base font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
                >
                  <CalendarDays className="h-4 w-4 text-emerald-700" aria-hidden />
                  {nombreDia(fecha, hoy)}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <Calendar
                  mode="single"
                  locale={es}
                  weekStartsOn={1}
                  selected={aFecha(fecha)}
                  defaultMonth={aFecha(fecha)}
                  onSelect={(d) => {
                    if (!d) return;
                    setFecha(isoLocal(d));
                    setCalendarioAbierto(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={() => setFecha(desplazar(fecha, 1))}
              aria-label="Día siguiente"
              className="flex w-11 items-center justify-center text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
          {fecha !== hoy && (
            <Button variant="ghost" onClick={() => setFecha(hoy)}>
              Volver a hoy
            </Button>
          )}

          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
            <label className="relative w-full sm:w-64">
              <span className="sr-only">Buscar</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Cliente, vale o quién recogió"
                className={cn(CLASE_CAMPO, "w-full pl-9")}
              />
            </label>
            {(datos?.almacenes.length ?? 0) > 1 && (
              <select
                value={almacen}
                onChange={(e) => setAlmacen(e.target.value)}
                aria-label="Almacén"
                className={cn(CLASE_CAMPO, "w-full sm:w-auto")}
              >
                <option value="">Todos los almacenes</option>
                {datos!.almacenes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {cargando && !datos ? (
          <p className="flex items-center gap-2 py-24 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando las entregas…
          </p>
        ) : error && !datos ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-600" aria-hidden />
            <p className="font-medium text-gray-900">No se pudieron cargar las entregas</p>
            <p className="text-sm text-gray-500">Revisa la conexión e inténtalo otra vez.</p>
            <Button onClick={() => setRecarga((n) => n + 1)}>Reintentar</Button>
          </div>
        ) : datos ? (
          <>
            <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-gray-700">
                <strong className="text-base font-semibold text-gray-900">{activas.length}</strong>{" "}
                {activas.length === 1 ? "entrega" : "entregas"} a{" "}
                <strong className="font-semibold text-gray-900">{clientes}</strong> {clientes === 1 ? "cliente" : "clientes"}
                {conDevolucion > 0 && (
                  <>
                    {" · "}
                    <strong className="font-semibold text-amber-800">{conDevolucion}</strong> con devolución
                  </>
                )}
              </p>
              {anulados > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={verAnulados}
                    onChange={(e) => setVerAnulados(e.target.checked)}
                    className="h-4 w-4 accent-emerald-700"
                  />
                  Ver {anulados} {anulados === 1 ? "anulado" : "anulados"}
                </label>
              )}
            </div>
            <div className="mt-2 h-0.5 overflow-hidden rounded" aria-hidden>
              {cargando && <div className="h-full w-full animate-pulse bg-emerald-600/60" />}
            </div>

            {entregas.length === 0 ? (
              <div className="mt-2 rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
                <PackageCheck className="mx-auto h-8 w-8 text-gray-400" aria-hidden />
                <p className="mt-3 font-medium text-gray-900">
                  {texto || almacen ? "Nada con esos filtros" : "Ese día no salió ningún vale del almacén"}
                </p>
              </div>
            ) : (
              <ul className="mt-2 divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
                {entregas.map((e) => (
                  <FilaEntrega
                    key={e.vale_id}
                    entrega={e}
                    abierta={abiertas.has(e.vale_id)}
                    onAlternar={() => alternar(e.vale_id)}
                  />
                ))}
              </ul>
            )}

            {otras.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold text-gray-900">Devoluciones de vales de otros días</h2>
                <p className="mt-1 text-sm text-gray-600">Se registraron este día, pero el vale salió antes.</p>
                <ul className="mt-4 space-y-3">
                  {otras.map((d) => (
                    <DevolucionDeOtroDia key={d.id} devolucion={d} />
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

function EstadoEntrega({ entrega: e }: { entrega: EntregaDelDia }) {
  if (e.estado === "anulado") {
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">Anulado</span>;
  }
  if (e.devolucion_total || e.estado === "devuelto") {
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">Devuelto</span>;
  }
  if (e.devoluciones.length > 0) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">Devolución parcial</span>
    );
  }
  return null;
}

function FilaEntrega({
  entrega: e,
  abierta,
  onAlternar,
}: {
  entrega: EntregaDelDia;
  abierta: boolean;
  onAlternar: () => void;
}) {
  const anulado = e.estado === "anulado";
  const n = e.materiales.length;
  const detalle = [
    e.almacen_nombre,
    e.recogido_por && `Recogió ${e.recogido_por}`,
    e.entregado_por && `Entregó ${e.entregado_por}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierta}
        className="flex w-full items-start gap-4 px-4 py-3.5 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
      >
        <span className="w-12 shrink-0 pt-0.5 text-sm font-medium tabular-nums text-gray-500">{hora(e.fecha)}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={cn("font-semibold text-gray-900", anulado && "text-gray-500 line-through")}>
              {e.cliente_nombre || "Sin cliente"}
            </span>
            {e.cliente_numero && <span className="text-xs text-gray-500">{e.cliente_numero}</span>}
            {e.tipo === "venta" && (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800">Venta</span>
            )}
            <EstadoEntrega entrega={e} />
          </span>
          <span className="mt-0.5 block text-sm text-gray-700">
            Vale {e.codigo}
            {e.solicitud_codigo ? ` · solicitud ${e.solicitud_codigo}` : ""}
          </span>
          {detalle && <span className="block text-xs text-gray-500">{detalle}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1 pt-0.5 text-sm text-gray-600">
          {n} {n === 1 ? "material" : "materiales"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", abierta && "rotate-180")} aria-hidden />
        </span>
      </button>
      {abierta && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 pb-4 pt-3 sm:pl-20">
          {anulado && e.motivo_anulacion && (
            <p className="mb-3 text-sm text-gray-700">Motivo de la anulación: {e.motivo_anulacion}</p>
          )}
          <TablaMateriales materiales={e.materiales} conDevuelto={e.devoluciones.length > 0} />
          {e.devoluciones.map((d) => (
            <BloqueDevolucion key={d.id} devolucion={d} />
          ))}
        </div>
      )}
    </li>
  );
}

function TablaMateriales({ materiales, conDevuelto }: { materiales: MaterialEntregado[]; conDevuelto: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500">
            <th className="py-1.5 pr-3 font-medium">Material</th>
            <th className="py-1.5 pr-3 text-right font-medium">Salió</th>
            {conDevuelto && <th className="py-1.5 pr-3 text-right font-medium">Devuelto</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {materiales.map((m) => (
            <tr key={m.material_id}>
              <td className="py-1.5 pr-3 text-gray-900">
                {nombreMaterial(m)}
                {m.material_codigo && m.material_descripcion && (
                  <span className="ml-2 text-xs text-gray-500">{m.material_codigo}</span>
                )}
              </td>
              <td className="whitespace-nowrap py-1.5 pr-3 text-right tabular-nums text-gray-900">
                {cantidad(m.cantidad)}
                {m.um ? ` ${m.um}` : ""}
              </td>
              {conDevuelto && (
                <td
                  className={cn(
                    "whitespace-nowrap py-1.5 pr-3 text-right tabular-nums",
                    m.devuelto > 0 ? "font-semibold text-amber-800" : "text-gray-400",
                  )}
                >
                  {m.devuelto > 0 ? cantidad(m.devuelto) : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BloqueDevolucion({ devolucion: d }: { devolucion: DevolucionRegistrada }) {
  const quien = [d.responsable && `Devolvió ${d.responsable}`, d.registrado_por && `registró ${d.registrado_por}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      <p className="flex flex-wrap items-center gap-x-2 font-semibold">
        <RotateCcw className="h-4 w-4" aria-hidden />
        Devolución
        {d.fecha && <span className="font-normal">· {diaYHora(d.fecha)}</span>}
      </p>
      {quien && <p className="mt-0.5">{quien}</p>}
      {d.comentario && <p className="mt-1 italic">{d.comentario}</p>}
      <ul className="mt-1.5 space-y-0.5">
        {d.materiales.map((m, i) => (
          <li key={`${m.material_id}-${i}`}>
            <span className="font-semibold tabular-nums">
              {cantidad(m.cantidad)}
              {m.um ? ` ${m.um}` : ""}
            </span>{" "}
            {nombreMaterial(m)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DevolucionDeOtroDia({ devolucion: d }: { devolucion: DevolucionOtroDia }) {
  const v = d.vale;
  return (
    <li className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="font-semibold text-gray-900">
        {v.cliente_nombre || "Sin cliente"}
        {v.cliente_numero && <span className="ml-2 text-xs font-normal text-gray-500">{v.cliente_numero}</span>}
      </p>
      <p className="text-sm text-gray-700">
        Vale {v.codigo}
        {v.fecha ? ` · salió el ${soloDia(v.fecha)}` : ""}
        {v.almacen_nombre ? ` · ${v.almacen_nombre}` : ""}
      </p>
      <BloqueDevolucion devolucion={d} />
    </li>
  );
}
