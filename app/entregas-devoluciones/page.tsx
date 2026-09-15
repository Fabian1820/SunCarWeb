"use client";

import { useEffect, useMemo, useState } from "react";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PackageCheck,
  RotateCcw,
  Search,
  type LucideIcon,
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
  EntregaDelDia,
  EntregasDelDia,
  MaterialDevuelto,
  MaterialEntregado,
} from "@/lib/types/feats/entregas-devoluciones/entregas-devoluciones-types";

const ZONA = "America/Havana";

type Pestana = "entregas" | "devoluciones";

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
 * Entregas y devoluciones: lo que sale del almacén cada día y lo que vuelve.
 *
 * Son dos cosas distintas y se ven distintas. Entregas va en verde sobre el
 * fondo de siempre, y cada vale dice en su columna de la derecha si se devolvió
 * algo. Devoluciones va en ámbar y cambia el fondo de toda la lista, para que no
 * se confunda una con otra.
 */
function EntregasDevoluciones() {
  const hoy = useMemo(() => isoLocal(new Date()), []);
  const [fecha, setFecha] = useState(hoy);
  const [datos, setDatos] = useState<EntregasDelDia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [pestana, setPestana] = useState<Pestana>("entregas");
  const [almacen, setAlmacen] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [verAnulados, setVerAnulados] = useState(false);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);

  // El día y la pestaña viven en la dirección: recargar o compartir el enlace no los pierde.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dia = params.get("dia");
    if (dia && esFechaIso(dia)) setFecha(dia);
    if (params.get("ver") === "devoluciones") setPestana("devoluciones");
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (fecha === hoy) url.searchParams.delete("dia");
    else url.searchParams.set("dia", fecha);
    if (pestana === "devoluciones") url.searchParams.set("ver", "devoluciones");
    else url.searchParams.delete("ver");
    window.history.replaceState(null, "", url.toString());
  }, [fecha, hoy, pestana]);

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
  const activasDelDia = delAlmacen.filter((e) => e.estado !== "anulado");
  const anulados = delAlmacen.length - activasDelDia.length;
  const entregas = delAlmacen.filter(
    (e) =>
      (verAnulados || e.estado !== "anulado") &&
      coincide(e.cliente_nombre, e.cliente_numero, e.codigo, e.solicitud_codigo, e.recogido_por),
  );
  const clientes = new Set(activasDelDia.map((e) => e.cliente_numero || e.cliente_nombre).filter(Boolean)).size;
  const conDevolucion = activasDelDia.filter((e) => e.devoluciones.length > 0).length;

  // Lo que volvió al almacén ese día: de los vales de hoy y de los de antes.
  const devolucionesDelDia: DevolucionOtroDia[] = [
    ...delAlmacen.flatMap((e) =>
      e.devoluciones.filter((d) => (d.fecha ?? "").slice(0, 10) === fecha).map((d) => ({ ...d, vale: e })),
    ),
    ...(datos?.devoluciones_otros_dias ?? []).filter((d) => !almacen || d.vale.almacen_id === almacen),
  ].sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));
  const devoluciones = devolucionesDelDia.filter((d) =>
    coincide(d.vale.cliente_nombre, d.vale.cliente_numero, d.vale.codigo, d.responsable),
  );
  const materialesDevueltos = devolucionesDelDia.reduce((n, d) => n + d.materiales.length, 0);

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
      <ModuleHeader title="Entregas y devoluciones" subtitle="Lo que sale del almacén cada día y lo que vuelve" />

      <main className="content-with-fixed-header mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="flex items-stretch overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setFecha(desplazar(fecha, -1))}
              aria-label="Día anterior"
              className="flex w-12 items-center justify-center text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <Popover open={calendarioAbierto} onOpenChange={setCalendarioAbierto}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-[16rem] items-center justify-center gap-2 border-x border-gray-200 px-4 py-2.5 text-base font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
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
              className="flex w-12 items-center justify-center text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
          {fecha !== hoy && (
            <Button variant="ghost" onClick={() => setFecha(hoy)}>
              Volver a hoy
            </Button>
          )}
          {(datos?.almacenes.length ?? 0) > 1 && (
            <select
              value={almacen}
              onChange={(e) => setAlmacen(e.target.value)}
              aria-label="Almacén"
              className={cn(CLASE_CAMPO, "w-full sm:ml-auto sm:w-auto")}
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

        <div role="tablist" aria-label="Qué ver" className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-gray-200/70 p-1 sm:inline-grid sm:w-[30rem]">
          <BotonPestana
            activa={pestana === "entregas"}
            onClick={() => setPestana("entregas")}
            Icono={PackageCheck}
            texto="Entregas"
            cuantos={activasDelDia.length}
            claseActiva="bg-emerald-800 text-white"
            claseIcono="text-emerald-800"
          />
          <BotonPestana
            activa={pestana === "devoluciones"}
            onClick={() => setPestana("devoluciones")}
            Icono={RotateCcw}
            texto="Devoluciones"
            cuantos={devolucionesDelDia.length}
            claseActiva="bg-amber-700 text-white"
            claseIcono="text-amber-700"
          />
        </div>

        {cargando && !datos ? (
          <p className="flex items-center gap-2 py-24 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando…
          </p>
        ) : error && !datos ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-600" aria-hidden />
            <p className="font-medium text-gray-900">No se pudieron cargar las entregas</p>
            <p className="text-sm text-gray-500">Revisa la conexión e inténtalo otra vez.</p>
            <Button onClick={() => setRecarga((n) => n + 1)}>Reintentar</Button>
          </div>
        ) : !datos ? null : pestana === "entregas" ? (
          <section className="mt-5" aria-label="Entregas">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-gray-600">Lo que salió del almacén este día</p>
                <p className="text-lg font-semibold text-gray-900">
                  {activasDelDia.length} {activasDelDia.length === 1 ? "entrega" : "entregas"} a {clientes}{" "}
                  {clientes === 1 ? "cliente" : "clientes"}
                  {conDevolucion > 0 && (
                    <span className="ml-2 text-sm font-semibold text-amber-800">
                      · {conDevolucion} {conDevolucion === 1 ? "tiene" : "tienen"} devolución
                    </span>
                  )}
                </p>
              </div>
              <Buscador valor={busqueda} onCambiar={setBusqueda} placeholder="Cliente, vale o quién recogió" />
            </div>
            {anulados > 0 && (
              <label className="mt-2 flex w-fit items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={verAnulados}
                  onChange={(e) => setVerAnulados(e.target.checked)}
                  className="h-4 w-4 accent-emerald-700"
                />
                Ver {anulados} {anulados === 1 ? "vale anulado" : "vales anulados"}
              </label>
            )}
            <BarraCarga visible={cargando} />

            {entregas.length === 0 ? (
              <Vacio
                Icono={PackageCheck}
                titulo={texto || almacen ? "Nada con esos filtros" : "No salió nada del almacén este día"}
              />
            ) : (
              <ul className="mt-2 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {entregas.map((e) => (
                  <FilaEntrega key={e.vale_id} entrega={e} abierta={abiertas.has(e.vale_id)} onAlternar={() => alternar(e.vale_id)} />
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section className="mt-5 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200 sm:p-5" aria-label="Devoluciones">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-amber-900">Lo que volvió al almacén este día</p>
                <p className="text-lg font-semibold text-gray-900">
                  {devolucionesDelDia.length} {devolucionesDelDia.length === 1 ? "devolución" : "devoluciones"}
                  {materialesDevueltos > 0 && (
                    <span className="font-normal text-gray-700">
                      {" "}
                      · {materialesDevueltos} {materialesDevueltos === 1 ? "material" : "materiales"}
                    </span>
                  )}
                </p>
              </div>
              {devolucionesDelDia.length > 0 && (
                <Buscador valor={busqueda} onCambiar={setBusqueda} placeholder="Cliente, vale o quién devolvió" />
              )}
            </div>
            <BarraCarga visible={cargando} />

            {devoluciones.length === 0 ? (
              <Vacio
                Icono={RotateCcw}
                titulo={devolucionesDelDia.length === 0 ? "No volvió nada al almacén este día" : "Nada con esa búsqueda"}
                ambar
              />
            ) : (
              <ul className="mt-2 space-y-3">
                {devoluciones.map((d) => (
                  <TarjetaDevolucion key={`${d.vale.vale_id}-${d.id}`} devolucion={d} dia={fecha} />
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function BotonPestana({
  activa,
  onClick,
  Icono,
  texto,
  cuantos,
  claseActiva,
  claseIcono,
}: {
  activa: boolean;
  onClick: () => void;
  Icono: LucideIcon;
  texto: string;
  cuantos: number;
  claseActiva: string;
  claseIcono: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      onClick={onClick}
      className={cn(
        "flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-base font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1",
        activa ? claseActiva : "text-gray-800 hover:bg-white/70",
      )}
    >
      <Icono className={cn("h-5 w-5", !activa && claseIcono)} aria-hidden />
      {texto}
      <span
        className={cn(
          "rounded-full px-2 text-sm font-bold tabular-nums leading-6",
          activa ? "bg-white/20 text-white" : "bg-white text-gray-700",
        )}
      >
        {cuantos}
      </span>
    </button>
  );
}

function Buscador({ valor, onCambiar, placeholder }: { valor: string; onCambiar: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative w-full sm:w-72">
      <span className="sr-only">Buscar</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
      <input value={valor} onChange={(e) => onCambiar(e.target.value)} placeholder={placeholder} className={cn(CLASE_CAMPO, "w-full pl-9")} />
    </label>
  );
}

function BarraCarga({ visible }: { visible: boolean }) {
  return (
    <div className="mt-3 h-0.5 overflow-hidden rounded" aria-hidden>
      {visible && <div className="h-full w-full animate-pulse bg-emerald-600/60" />}
    </div>
  );
}

function Vacio({ Icono, titulo, ambar }: { Icono: LucideIcon; titulo: string; ambar?: boolean }) {
  return (
    <div
      className={cn(
        "mt-2 rounded-xl border border-dashed px-6 py-12 text-center",
        ambar ? "border-amber-300 bg-white/60" : "border-gray-300 bg-white",
      )}
    >
      <Icono className={cn("mx-auto h-8 w-8", ambar ? "text-amber-600" : "text-gray-400")} aria-hidden />
      <p className="mt-3 font-medium text-gray-900">{titulo}</p>
    </div>
  );
}

/** Si se devolvió algo de ese vale, se ve sin abrirlo. */
function EstadoDevolucion({ entrega: e }: { entrega: EntregaDelDia }) {
  const devueltos = e.materiales.filter((m) => m.devuelto > 0).length;
  const [clase, Icono, texto] =
    e.estado === "anulado"
      ? (["bg-gray-100 text-gray-700", Ban, "Vale anulado"] as const)
      : e.devolucion_total || e.estado === "devuelto"
        ? (["bg-amber-100 text-amber-900", RotateCcw, "Se devolvió todo"] as const)
        : e.devoluciones.length > 0
          ? (["bg-amber-100 text-amber-900", RotateCcw, `Devolvieron ${devueltos} de ${e.materiales.length}`] as const)
          : (["bg-emerald-50 text-emerald-800", CheckCircle2, "Sin devolución"] as const);
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-semibold", clase)}>
      <Icono className="h-4 w-4" aria-hidden />
      {texto}
    </span>
  );
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
    e.recogido_por && `Lo recogió ${e.recogido_por}`,
    e.entregado_por && `Lo entregó ${e.entregado_por}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierta}
        className="flex w-full flex-wrap items-start gap-x-4 gap-y-2 px-4 py-4 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 sm:flex-nowrap"
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            anulado ? "bg-gray-100 text-gray-500" : "bg-emerald-50 text-emerald-800",
          )}
        >
          <PackageCheck className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm font-semibold", anulado ? "text-gray-500" : "text-emerald-800")}>
            Salió a las {hora(e.fecha)}
            <span className="ml-2 font-normal text-gray-500">Vale {e.codigo}</span>
            {e.tipo === "venta" && (
              <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800">Venta</span>
            )}
          </span>
          <span className={cn("mt-0.5 block text-base font-semibold text-gray-900", anulado && "text-gray-500 line-through")}>
            {e.cliente_nombre || "Sin cliente"}
            {e.cliente_numero && <span className="ml-2 text-xs font-normal text-gray-500 no-underline">{e.cliente_numero}</span>}
          </span>
          {detalle && <span className="block text-sm text-gray-600">{detalle}</span>}
        </span>
        <span className="flex w-full shrink-0 items-center justify-between gap-3 pl-14 sm:w-auto sm:flex-col sm:items-end sm:pl-0">
          <EstadoDevolucion entrega={e} />
          <span className="flex items-center gap-1 text-sm font-medium text-emerald-800">
            {abierta ? "Ocultar" : `Ver ${n} ${n === 1 ? "material" : "materiales"}`}
            <ChevronDown className={cn("h-4 w-4 transition-transform", abierta && "rotate-180")} aria-hidden />
          </span>
        </span>
      </button>
      {abierta && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 pb-4 pt-3 sm:pl-[4.5rem]">
          {anulado && e.motivo_anulacion && <p className="mb-3 text-sm text-gray-700">Motivo de la anulación: {e.motivo_anulacion}</p>}
          <TablaMateriales materiales={e.materiales} conDevuelto={e.devoluciones.length > 0} />
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
            {conDevuelto && <th className="py-1.5 pr-3 text-right font-medium">Volvió</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {materiales.map((m) => (
            <tr key={m.material_id}>
              <td className="py-2 pr-3 text-gray-900">
                {nombreMaterial(m)}
                {m.material_codigo && m.material_descripcion && <span className="ml-2 text-xs text-gray-500">{m.material_codigo}</span>}
              </td>
              <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums text-gray-900">
                {cantidad(m.cantidad)}
                {m.um ? ` ${m.um}` : ""}
              </td>
              {conDevuelto && (
                <td
                  className={cn(
                    "whitespace-nowrap py-2 pr-3 text-right tabular-nums",
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

function TarjetaDevolucion({ devolucion: d, dia }: { devolucion: DevolucionOtroDia; dia: string }) {
  const v = d.vale;
  const salio = !v.fecha ? null : v.fecha.slice(0, 10) === dia ? "salió este mismo día" : `salió el ${soloDia(v.fecha)}`;
  const quien = [d.responsable && `Lo devolvió ${d.responsable}`, d.registrado_por && `lo registró ${d.registrado_por}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="rounded-xl border border-amber-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <RotateCcw className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-800">
            Volvió a las {hora(d.fecha)}
            <span className="ml-2 font-normal text-gray-500">
              Vale {v.codigo}
              {salio ? ` · ${salio}` : ""}
            </span>
          </p>
          <p className="mt-0.5 text-base font-semibold text-gray-900">
            {v.cliente_nombre || "Sin cliente"}
            {v.cliente_numero && <span className="ml-2 text-xs font-normal text-gray-500">{v.cliente_numero}</span>}
          </p>
          {(v.almacen_nombre || quien) && (
            <p className="text-sm text-gray-600">{[v.almacen_nombre, quien].filter(Boolean).join(" · ")}</p>
          )}
          {d.comentario && <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-800">{d.comentario}</p>}
          <p className="mt-3 text-xs font-semibold text-gray-500">Materiales que volvieron</p>
          <ul className="mt-1 divide-y divide-gray-100 text-sm">
            {d.materiales.map((m: MaterialDevuelto, i) => (
              <li key={`${m.material_id}-${i}`} className="flex justify-between gap-4 py-1.5">
                <span className="min-w-0 text-gray-900">{nombreMaterial(m)}</span>
                <span className="shrink-0 font-semibold tabular-nums text-amber-900">
                  {cantidad(m.cantidad)}
                  {m.um ? ` ${m.um}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}
