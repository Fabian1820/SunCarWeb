"use client";

import { useEffect, useState } from "react";
import {
  BatteryCharging,
  Building2,
  ChevronLeft,
  History,
  Loader2,
  Package,
  Search,
  SlidersHorizontal,
  Sun,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { RouteGuard } from "@/components/auth/route-guard";
import { Button } from "@/components/shared/atom/button";
import { cn } from "@/lib/utils";
import { HistorialClientePanel, iniciales } from "@/components/feats/historial/historial-cliente-panel";
import { HistorialService } from "@/lib/services/feats/historial/historial-service";
import type {
  ClaveCategoriaEquipo,
  ClaveUeb,
  ClienteHistorial,
  ClientesDeEquipo,
  EquipoHistorial,
  FiltrosClienteHistorial,
  OpcionesFiltroClientes,
  UebResumen,
} from "@/lib/types/feats/historial/historial-types";

type Vista = "clientes" | "equipos";

const CLASE_CAMPO =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";

const CLASE_SELECT =
  "h-10 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:bg-gray-100 disabled:text-gray-400";

const ICONO_CATEGORIA: Record<ClaveCategoriaEquipo, LucideIcon> = {
  inversores: Zap,
  baterias: BatteryCharging,
  paneles: Sun,
};

export default function HistorialPage() {
  return (
    <RouteGuard requiredModule="historial">
      <Historial />
    </RouteGuard>
  );
}

/**
 * Historial: dos maneras de llegar a lo que ha pasado con un cliente.
 *
 * Por clientes, buscándolo. Por equipos, desde lo que lleva: los inversores,
 * baterías y paneles de las ofertas confirmadas, cuántos clientes tiene cada
 * uno y, al tocarlo, quiénes son.
 */
function Historial() {
  const [vista, setVista] = useState<Vista>("equipos");

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader title="Clientes" subtitle="Lo que ha pasado con cada cliente y qué equipos lleva" />
      <main className="content-with-fixed-header mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div role="tablist" aria-label="Cómo ver el historial" className="grid grid-cols-2 gap-1 rounded-xl bg-gray-200/70 p-1 sm:inline-grid sm:w-[26rem]">
          {(
            [
              { clave: "clientes", texto: "Por clientes", Icono: Users },
              { clave: "equipos", texto: "Por equipos", Icono: Zap },
            ] as const
          ).map(({ clave, texto, Icono }) => (
            <button
              key={clave}
              type="button"
              role="tab"
              aria-selected={vista === clave}
              onClick={() => setVista(clave)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                vista === clave ? "bg-emerald-800 text-white shadow-sm" : "text-gray-700 hover:bg-white/70",
              )}
            >
              <Icono className="h-4 w-4" aria-hidden />
              {texto}
            </button>
          ))}
        </div>

        {vista === "clientes" ? <VistaClientes /> : <VistaEquipos />}
      </main>
    </div>
  );
}

function SinSeleccion({ texto }: { texto: string }) {
  return (
    <div className="hidden min-h-[20rem] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 text-center lg:flex">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
        <History className="h-7 w-7" aria-hidden />
      </span>
      <p className="mt-4 max-w-sm text-sm text-gray-600">{texto}</p>
    </div>
  );
}

function FilaCliente({
  cliente: c,
  marcado,
  extra,
  onClick,
}: {
  cliente: ClienteHistorial;
  marcado: boolean;
  extra?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={marcado ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600",
          marcado ? "bg-emerald-800" : "hover:bg-gray-50",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            marcado ? "bg-white text-emerald-900" : "bg-emerald-50 text-emerald-900",
          )}
        >
          {iniciales(c.nombre || c.numero)}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm font-semibold", marcado ? "text-white" : "text-gray-900")}>
            {c.nombre || c.numero}
          </span>
          <span className={cn("block truncate text-xs", marcado ? "text-emerald-100" : "text-gray-500")}>
            {[c.numero, c.estado].filter(Boolean).join(" · ")}
          </span>
        </span>
        {extra}
      </button>
    </li>
  );
}

function VistaClientes() {
  const [q, setQ] = useState("");
  const [clientes, setClientes] = useState<ClienteHistorial[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosClienteHistorial>({});
  const [verFiltros, setVerFiltros] = useState(false);
  const [opciones, setOpciones] = useState<OpcionesFiltroClientes | null>(null);
  const activos = Object.values(filtros).filter(Boolean).length;
  const municipios = opciones?.provincias.find((p) => p.nombre === filtros.provincia)?.municipios ?? [];

  useEffect(() => {
    HistorialService.filtrosClientes()
      .then(setOpciones)
      .catch(() => setOpciones({ estados: [], provincias: [] }));
  }, []);

  // La búsqueda la hace el servidor: se espera a que se deje de teclear.
  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    const id = setTimeout(
      () => {
        HistorialService.clientes(q, 0, 50, filtros)
          .then((r) => {
            if (cancelado) return;
            setClientes(r.data);
            setTotal(r.total);
            setError(false);
          })
          .catch(() => !cancelado && setError(true))
          .finally(() => !cancelado && setCargando(false));
      },
      q ? 300 : 0,
    );
    return () => {
      cancelado = true;
      clearTimeout(id);
    };
  }, [q, filtros]);

  function cargarMas() {
    setCargandoMas(true);
    HistorialService.clientes(q, clientes.length, 50, filtros)
      .then((r) => {
        const vistos = new Set(clientes.map((c) => c.numero));
        setClientes([...clientes, ...r.data.filter((c) => !vistos.has(c.numero))]);
        setTotal(r.total);
      })
      .catch(() => setError(true))
      .finally(() => setCargandoMas(false));
  }

  return (
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
      <section
        className={cn("overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-20", seleccionado && "hidden lg:block")}
      >
        <div className="border-b border-gray-100 p-3">
          <label className="relative block">
            <span className="sr-only">Buscar cliente</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, número o teléfono" className={cn(CLASE_CAMPO, "pl-9")} />
          </label>
          <div className="mt-2 flex items-center justify-between gap-2 px-1">
            <p className="text-xs text-gray-500">
              {cargando ? "Buscando…" : `${total} ${total === 1 ? "cliente" : "clientes"}`}
            </p>
            <button
              type="button"
              onClick={() => setVerFiltros((v) => !v)}
              aria-expanded={verFiltros}
              className={cn(
                "inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium hover:bg-gray-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                activos > 0 ? "text-emerald-800" : "text-gray-700",
              )}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filtros
              {activos > 0 && (
                <span className="rounded-full bg-emerald-800 px-1.5 text-xs font-semibold leading-5 text-white">{activos}</span>
              )}
            </button>
          </div>
          {verFiltros && (
            <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-2">
              <select
                value={filtros.estado ?? ""}
                onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value || undefined }))}
                aria-label="Estado del cliente"
                className={CLASE_SELECT}
              >
                <option value="">Todos los estados</option>
                {(opciones?.estados ?? []).map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={filtros.provincia ?? ""}
                  onChange={(e) => setFiltros((f) => ({ ...f, provincia: e.target.value || undefined, municipio: undefined }))}
                  aria-label="Provincia"
                  className={CLASE_SELECT}
                >
                  <option value="">Provincia</option>
                  {(opciones?.provincias ?? []).map((p) => (
                    <option key={p.nombre} value={p.nombre}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                <select
                  value={filtros.municipio ?? ""}
                  onChange={(e) => setFiltros((f) => ({ ...f, municipio: e.target.value || undefined }))}
                  aria-label="Municipio"
                  disabled={!filtros.provincia}
                  className={CLASE_SELECT}
                >
                  <option value="">Municipio</option>
                  {municipios.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-medium text-gray-600">
                  Creado desde
                  <input
                    type="date"
                    value={filtros.desde ?? ""}
                    max={filtros.hasta}
                    onChange={(e) => setFiltros((f) => ({ ...f, desde: e.target.value || undefined }))}
                    className={cn(CLASE_SELECT, "mt-1")}
                  />
                </label>
                <label className="text-xs font-medium text-gray-600">
                  Hasta
                  <input
                    type="date"
                    value={filtros.hasta ?? ""}
                    min={filtros.desde}
                    onChange={(e) => setFiltros((f) => ({ ...f, hasta: e.target.value || undefined }))}
                    className={cn(CLASE_SELECT, "mt-1")}
                  />
                </label>
              </div>
              {activos > 0 && (
                <button type="button" onClick={() => setFiltros({})} className="text-sm font-medium text-emerald-800 hover:underline">
                  Quitar filtros
                </button>
              )}
            </div>
          )}
        </div>
        {error && clientes.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-600">No se pudieron cargar los clientes.</p>
        ) : (
          <ul className="max-h-[calc(100vh-17rem)] divide-y divide-gray-100 overflow-y-auto">
            {clientes.map((c) => (
              <FilaCliente key={c.numero} cliente={c} marcado={c.numero === seleccionado} onClick={() => setSeleccionado(c.numero)} />
            ))}
            {!cargando && clientes.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-gray-600">
                {activos > 0 ? "Nadie con esos filtros." : "Nadie con esa búsqueda."}
              </li>
            )}
            {clientes.length < total && (
              <li className="p-2">
                <Button variant="ghost" className="w-full" onClick={cargarMas} disabled={cargandoMas}>
                  {cargandoMas ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : `Cargar más (${total - clientes.length})`}
                </Button>
              </li>
            )}
          </ul>
        )}
      </section>
      <section className={cn(!seleccionado && "hidden lg:block")}>
        {seleccionado ? (
          <HistorialClientePanel numero={seleccionado} onVolver={() => setSeleccionado(null)} volverTexto="Clientes" />
        ) : (
          <SinSeleccion texto="Elige un cliente para ver lo que ha pasado con él, en el orden en que pasó." />
        )}
      </section>
    </div>
  );
}

function potencia(kw: number | null | undefined, categoria: ClaveCategoriaEquipo): string | null {
  if (kw == null) return null;
  if (categoria === "paneles" && kw < 1) return `${Math.round(kw * 1000)} W`;
  const valor = Number.isInteger(kw) ? String(kw) : kw.toLocaleString("es", { maximumFractionDigits: 2 });
  return `${valor} ${categoria === "baterias" ? "kWh" : "kW"}`;
}

function numero(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString("es") : n.toLocaleString("es", { maximumFractionDigits: 2 });
}

function FotoEquipo({ foto, categoria, tamano }: { foto?: string | null; categoria: ClaveCategoriaEquipo; tamano: string }) {
  const Icono = ICONO_CATEGORIA[categoria] ?? Package;
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100", tamano)}>
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
      ) : (
        <Icono className="h-7 w-7 text-gray-400" aria-hidden />
      )}
    </span>
  );
}

/**
 * Por equipos: primero la UEB (Instaladora Habana, UEB Las Tunas, UEB Santa
 * Clara), según el comercial que atendió al cliente; luego los inversores de
 * esa UEB, cuántos clientes tiene cada uno; y al tocar uno, quiénes son.
 */
function VistaEquipos() {
  const [ueb, setUeb] = useState<UebResumen[] | null>(null);
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [uebActiva, setUebActiva] = useState<UebResumen | null>(null);

  useEffect(() => {
    let cancelado = false;
    setError(false);
    HistorialService.ueb()
      .then((u) => !cancelado && setUeb(u))
      .catch(() => !cancelado && setError(true));
    return () => {
      cancelado = true;
    };
  }, [recarga]);

  if (error && !ueb) {
    return (
      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <p className="font-medium text-gray-900">No se pudieron cargar las UEB</p>
        <Button onClick={() => setRecarga((n) => n + 1)}>Reintentar</Button>
      </div>
    );
  }
  if (!ueb) {
    return (
      <p className="mt-10 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Contando los clientes de cada UEB…
      </p>
    );
  }

  if (uebActiva) {
    return <EquiposDeUeb ueb={uebActiva} onVolver={() => setUebActiva(null)} />;
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-gray-600">Elige una UEB para ver sus inversores y quién los tiene.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ueb.map((u) => (
          <li key={u.clave}>
            <button
              type="button"
              onClick={() => setUebActiva(u)}
              className="flex h-full w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-600 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
                <Building2 className="h-6 w-6" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base font-semibold text-gray-900">{u.nombre}</span>
                <span className="mt-0.5 text-sm font-semibold text-emerald-800">
                  {numero(u.clientes)} {u.clientes === 1 ? "cliente" : "clientes"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EquiposDeUeb({ ueb, onVolver }: { ueb: UebResumen; onVolver: () => void }) {
  const [datos, setDatos] = useState<{ ueb: UebResumen; equipos: EquipoHistorial[] } | null>(null);
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [equipo, setEquipo] = useState<EquipoHistorial | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelado = false;
    setError(false);
    setDatos(null);
    HistorialService.equiposUeb(ueb.clave)
      .then((d) => !cancelado && setDatos(d))
      .catch(() => !cancelado && setError(true));
    return () => {
      cancelado = true;
    };
  }, [ueb.clave, recarga]);

  if (equipo) {
    return (
      <ClientesDelEquipo
        equipo={equipo}
        categoria="inversores"
        categoriaNombre={ueb.nombre}
        ueb={ueb.clave}
        onVolver={() => setEquipo(null)}
      />
    );
  }

  const texto = q.trim().toLowerCase();
  const equipos = (datos?.equipos ?? []).filter(
    (e) => !texto || [e.descripcion, e.marca, e.material_codigo].some((v) => (v ?? "").toLowerCase().includes(texto)),
  );

  return (
    <div className="mt-6">
      <button type="button" onClick={onVolver} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        UEB
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{ueb.nombre}</h2>
        <span className="text-sm font-semibold text-emerald-800">
          {numero(ueb.clientes)} {ueb.clientes === 1 ? "cliente" : "clientes"}
        </span>
        <label className="relative w-full sm:ml-auto sm:w-72">
          <span className="sr-only">Buscar inversor</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Modelo, marca o código" className={cn(CLASE_CAMPO, "pl-9")} />
        </label>
      </div>
      <p className="mt-3 text-sm text-gray-600">Inversores de las ofertas confirmadas de esta UEB. Toca uno para ver quién lo tiene.</p>

      {error && !datos ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <p className="text-sm text-gray-600">No se pudieron cargar los inversores de esta UEB.</p>
          <Button onClick={() => setRecarga((n) => n + 1)}>Reintentar</Button>
        </div>
      ) : !datos ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Contando los inversores…
        </p>
      ) : equipos.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-600">
          {texto ? "Ningún inversor con esa búsqueda." : "Ninguna oferta confirmada de esta UEB lleva inversor."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {equipos.map((e) => {
            const p = potencia(e.potencia_kw, "inversores");
            return (
              <li key={e.material_codigo}>
                <button
                  type="button"
                  onClick={() => setEquipo(e)}
                  className="flex h-full w-full gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-emerald-600 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <FotoEquipo foto={e.foto} categoria="inversores" tamano="h-20 w-20" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="line-clamp-2 text-sm font-semibold text-gray-900">{e.descripcion.trim()}</span>
                    {e.marca && <span className="mt-0.5 text-xs text-gray-500">{e.marca}</span>}
                    <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2">
                      {p && <span className="rounded-md bg-gray-900 px-2 py-0.5 text-xs font-bold text-white">{p}</span>}
                      <span className="text-sm font-semibold text-emerald-800">
                        {numero(e.clientes)} {e.clientes === 1 ? "cliente" : "clientes"}
                      </span>
                      <span className="text-xs text-gray-500">· {numero(e.unidades)} ud.</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ClientesDelEquipo({
  equipo,
  categoria,
  categoriaNombre,
  ueb,
  onVolver,
}: {
  equipo: EquipoHistorial;
  categoria: ClaveCategoriaEquipo;
  categoriaNombre: string;
  ueb?: ClaveUeb;
  onVolver: () => void;
}) {
  const [datos, setDatos] = useState<ClientesDeEquipo | null>(null);
  const [error, setError] = useState(false);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    HistorialService.clientesDeEquipo(equipo.material_codigo, ueb)
      .then((d) => !cancelado && setDatos(d))
      .catch(() => !cancelado && setError(true));
    return () => {
      cancelado = true;
    };
  }, [equipo.material_codigo, ueb]);

  const p = potencia(equipo.potencia_kw, categoria);

  return (
    <div className="mt-6">
      <button type="button" onClick={onVolver} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {categoriaNombre}
      </button>
      <div className="mt-3 flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <FotoEquipo foto={equipo.foto} categoria={categoria} tamano="h-20 w-20" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">{equipo.descripcion.trim()}</h2>
          <p className="text-sm text-gray-600">{[equipo.marca, equipo.material_codigo].filter(Boolean).join(" · ")}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            {p && <span className="rounded-md bg-gray-900 px-2 py-0.5 text-xs font-bold text-white">{p}</span>}
            <span className="font-semibold text-emerald-800">
              {numero(equipo.clientes)} {equipo.clientes === 1 ? "cliente" : "clientes"}
            </span>
            <span className="text-gray-600">
              · {numero(equipo.unidades)} {equipo.unidades === 1 ? "unidad" : "unidades"}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <section className={cn("overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-20", seleccionado && "hidden lg:block")}>
          {error ? (
            <p className="px-4 py-6 text-center text-sm text-gray-600">No se pudieron cargar los clientes de este equipo.</p>
          ) : !datos ? (
            <p className="flex items-center gap-2 px-4 py-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Buscando quién lo tiene…
            </p>
          ) : (
            <ul className="max-h-[calc(100vh-22rem)] divide-y divide-gray-100 overflow-y-auto">
              {datos.clientes.map((c) => (
                <FilaCliente
                  key={c.numero}
                  cliente={c}
                  marcado={c.numero === seleccionado}
                  onClick={() => setSeleccionado(c.numero)}
                  extra={
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums",
                        c.numero === seleccionado ? "bg-white text-emerald-900" : "bg-emerald-50 text-emerald-900",
                      )}
                    >
                      × {numero(c.cantidad)}
                    </span>
                  }
                />
              ))}
            </ul>
          )}
        </section>
        <section className={cn(!seleccionado && "hidden lg:block")}>
          {seleccionado ? (
            <HistorialClientePanel numero={seleccionado} onVolver={() => setSeleccionado(null)} volverTexto="Clientes con este equipo" />
          ) : (
            <SinSeleccion texto="Elige un cliente para ver su historial." />
          )}
        </section>
      </div>
    </div>
  );
}
