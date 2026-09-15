"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, History, Loader2, Search } from "lucide-react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { RouteGuard } from "@/components/auth/route-guard";
import { Button } from "@/components/shared/atom/button";
import { cn } from "@/lib/utils";
import { HistorialClientePanel } from "@/components/feats/historial/historial-cliente-panel";
import { HistorialService } from "@/lib/services/feats/historial/historial-service";
import type {
  CategoriaEquipos,
  ClaveCategoriaEquipo,
  ClienteDeEquipo,
  ClienteHistorial,
  ClientesDeEquipo,
  EquipoHistorial,
} from "@/lib/types/feats/historial/historial-types";

type Vista = "clientes" | "equipos";

const CLASE_CAMPO =
  "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";

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
 * Por clientes, buscándolo. Por equipos, desde lo que lleva instalado: todos
 * los inversores (o baterías, o paneles) de las ofertas confirmadas, cuántos
 * clientes tiene cada uno y, al tocarlo, quiénes son.
 */
function Historial() {
  const [vista, setVista] = useState<Vista>("clientes");

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader title="Historial" subtitle="Todo lo que ha pasado con cada cliente y qué equipos lleva" />
      <main className="content-with-fixed-header mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div role="tablist" aria-label="Cómo ver el historial" className="inline-flex rounded-lg bg-gray-200/70 p-1">
          {(
            [
              { clave: "clientes", texto: "Por clientes" },
              { clave: "equipos", texto: "Por equipos" },
            ] as const
          ).map(({ clave, texto }) => (
            <button
              key={clave}
              type="button"
              role="tab"
              aria-selected={vista === clave}
              onClick={() => setVista(clave)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                vista === clave ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900",
              )}
            >
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
    <div className="hidden h-full min-h-[18rem] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 text-center lg:flex">
      <History className="h-8 w-8 text-gray-400" aria-hidden />
      <p className="mt-3 max-w-sm text-sm text-gray-600">{texto}</p>
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
          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600",
          marcado ? "bg-emerald-50" : "hover:bg-gray-50",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm font-semibold", marcado ? "text-emerald-900" : "text-gray-900")}>
            {c.nombre || c.numero}
          </span>
          <span className="block truncate text-xs text-gray-500">{[c.numero, c.estado].filter(Boolean).join(" · ")}</span>
          {c.direccion && <span className="block truncate text-xs text-gray-500">{c.direccion}</span>}
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

  // La búsqueda la hace el servidor: se espera a que se deje de teclear.
  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    const id = setTimeout(() => {
      HistorialService.clientes(q, 0)
        .then((r) => {
          if (cancelado) return;
          setClientes(r.data);
          setTotal(r.total);
          setError(false);
        })
        .catch(() => !cancelado && setError(true))
        .finally(() => !cancelado && setCargando(false));
    }, q ? 300 : 0);
    return () => {
      cancelado = true;
      clearTimeout(id);
    };
  }, [q]);

  function cargarMas() {
    setCargandoMas(true);
    HistorialService.clientes(q, clientes.length)
      .then((r) => {
        const vistos = new Set(clientes.map((c) => c.numero));
        setClientes([...clientes, ...r.data.filter((c) => !vistos.has(c.numero))]);
        setTotal(r.total);
      })
      .catch(() => setError(true))
      .finally(() => setCargandoMas(false));
  }

  return (
    <div className="mt-5 grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <section className={cn(seleccionado && "hidden lg:block")}>
        <label className="relative block">
          <span className="sr-only">Buscar cliente</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre, número, dirección o teléfono"
            className={cn(CLASE_CAMPO, "pl-9")}
          />
        </label>
        <p className="mt-3 text-xs text-gray-500">
          {cargando ? "Buscando…" : `${total} ${total === 1 ? "cliente" : "clientes"}`}
        </p>
        {error && clientes.length === 0 ? (
          <p className="mt-2 rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-600">
            No se pudieron cargar los clientes.
          </p>
        ) : (
          <ul className="mt-2 max-h-[calc(100vh-18rem)] divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 bg-white">
            {clientes.map((c) => (
              <FilaCliente key={c.numero} cliente={c} marcado={c.numero === seleccionado} onClick={() => setSeleccionado(c.numero)} />
            ))}
            {!cargando && clientes.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-gray-600">Nadie con esa búsqueda.</li>
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
          <SinSeleccion texto="Elige un cliente para ver todo lo que ha pasado con él, en el orden en que pasó." />
        )}
      </section>
    </div>
  );
}

function potencia(kw: number | null | undefined, categoria: ClaveCategoriaEquipo): string {
  if (kw == null) return "—";
  const unidad = categoria === "baterias" ? "kWh" : "kW";
  if (kw < 1 && categoria === "paneles") return `${Math.round(kw * 1000)} W`;
  return `${Number.isInteger(kw) ? kw : kw.toLocaleString("es", { maximumFractionDigits: 2 })} ${unidad}`;
}

function numero(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString("es") : n.toLocaleString("es", { maximumFractionDigits: 2 });
}

function VistaEquipos() {
  const [categorias, setCategorias] = useState<CategoriaEquipos[] | null>(null);
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [categoria, setCategoria] = useState<ClaveCategoriaEquipo>("inversores");
  const [equipo, setEquipo] = useState<EquipoHistorial | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelado = false;
    setError(false);
    HistorialService.equipos()
      .then((c) => !cancelado && setCategorias(c))
      .catch(() => !cancelado && setError(true));
    return () => {
      cancelado = true;
    };
  }, [recarga]);

  if (error && !categorias) {
    return (
      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <p className="font-medium text-gray-900">No se pudieron cargar los equipos</p>
        <Button onClick={() => setRecarga((n) => n + 1)}>Reintentar</Button>
      </div>
    );
  }
  if (!categorias) {
    return (
      <p className="mt-10 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Contando equipos de las ofertas confirmadas…
      </p>
    );
  }

  const actual = categorias.find((c) => c.clave === categoria);
  if (equipo) {
    return (
      <ClientesDelEquipo
        equipo={equipo}
        categoria={categoria}
        categoriaNombre={actual?.nombre ?? "Equipos"}
        onVolver={() => setEquipo(null)}
      />
    );
  }

  const texto = q.trim().toLowerCase();
  const equipos = (actual?.equipos ?? []).filter(
    (e) => !texto || [e.descripcion, e.marca, e.material_codigo].some((v) => (v ?? "").toLowerCase().includes(texto)),
  );

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <button
              key={c.clave}
              type="button"
              aria-pressed={c.clave === categoria}
              onClick={() => setCategoria(c.clave)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                c.clave === categoria
                  ? "border-emerald-800 bg-emerald-800 font-semibold text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400",
              )}
            >
              {c.nombre} <span className="tabular-nums opacity-80">{c.equipos.length}</span>
            </button>
          ))}
        </div>
        <label className="relative w-full sm:ml-auto sm:w-72">
          <span className="sr-only">Buscar equipo</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Modelo, marca o código" className={cn(CLASE_CAMPO, "pl-9")} />
        </label>
      </div>
      <p className="mt-3 text-sm text-gray-600">
        De las ofertas confirmadas por los clientes. Toca un equipo para ver quién lo tiene.
      </p>

      <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
              <th className="px-4 py-2.5 font-medium">Equipo</th>
              <th className="px-4 py-2.5 text-right font-medium">{categoria === "baterias" ? "Capacidad" : "Potencia"}</th>
              <th className="px-4 py-2.5 text-right font-medium">Clientes</th>
              <th className="px-4 py-2.5 text-right font-medium">Unidades</th>
              <th className="px-4 py-2.5 text-right font-medium">Ofertas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {equipos.map((e) => (
              <tr
                key={e.material_codigo}
                onClick={() => setEquipo(e)}
                className="cursor-pointer hover:bg-emerald-50/60"
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setEquipo(e);
                    }}
                    className="text-left font-semibold text-gray-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  >
                    {e.descripcion.trim()}
                  </button>
                  <span className="block text-xs text-gray-500">{[e.marca, e.material_codigo].filter(Boolean).join(" · ")}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-900">
                  {potencia(e.potencia_kw, categoria)}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{numero(e.clientes)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">{numero(e.unidades)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">{numero(e.ofertas)}</td>
              </tr>
            ))}
            {equipos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-600">
                  {texto ? "Ningún equipo con esa búsqueda." : "Ninguna oferta confirmada lleva equipos de este tipo."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClientesDelEquipo({
  equipo,
  categoria,
  categoriaNombre,
  onVolver,
}: {
  equipo: EquipoHistorial;
  categoria: ClaveCategoriaEquipo;
  categoriaNombre: string;
  onVolver: () => void;
}) {
  const [datos, setDatos] = useState<ClientesDeEquipo | null>(null);
  const [error, setError] = useState(false);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    HistorialService.clientesDeEquipo(equipo.material_codigo)
      .then((d) => !cancelado && setDatos(d))
      .catch(() => !cancelado && setError(true));
    return () => {
      cancelado = true;
    };
  }, [equipo.material_codigo]);

  const clientes: ClienteDeEquipo[] = datos?.clientes ?? [];

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={onVolver}
        className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {categoriaNombre}
      </button>
      <h2 className="mt-2 text-xl font-semibold text-gray-900">{equipo.descripcion.trim()}</h2>
      <p className="text-sm text-gray-600">
        {[
          equipo.marca,
          equipo.potencia_kw != null ? potencia(equipo.potencia_kw, categoria) : null,
          `${numero(equipo.unidades)} ${equipo.unidades === 1 ? "unidad" : "unidades"} en ${equipo.clientes} ${equipo.clientes === 1 ? "cliente" : "clientes"}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section className={cn(seleccionado && "hidden lg:block")}>
          {error ? (
            <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-600">
              No se pudieron cargar los clientes de este equipo.
            </p>
          ) : !datos ? (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Buscando quién lo tiene…
            </p>
          ) : (
            <ul className="max-h-[calc(100vh-20rem)] divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 bg-white">
              {clientes.map((c) => (
                <FilaCliente
                  key={c.numero}
                  cliente={c}
                  marcado={c.numero === seleccionado}
                  onClick={() => setSeleccionado(c.numero)}
                  extra={
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold tabular-nums text-gray-900">× {numero(c.cantidad)}</span>
                      <span className="block text-xs text-gray-500">{c.ofertas.join(", ")}</span>
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
