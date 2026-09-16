"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileDown,
  Loader2,
  RefreshCw,
  Wallet as WalletIcon,
} from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { MonthPicker } from "@/components/shared/molecule/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Card, CardContent } from "@/components/shared/molecule/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { useToast } from "@/hooks/use-toast";
import { ContabilidadFinancieraService } from "@/lib/api-services";
import { CATEGORIAS_CONTABILIDAD } from "@/lib/api-types";
import type {
  CategoriaContabilidad,
  ContabilidadGastoMovimiento,
  ContabilidadGeneral,
  ContabilidadIngresos,
  ContabilidadMovimiento,
  ContabilidadResumen,
  MontosPorMoneda,
} from "@/lib/api-types";
import { exportListToPDF } from "@/lib/export-list-pdf";

type ModoFiltro = "mes" | "rango";
type MonedaFiltro = "todas" | string;

const ORDEN_MONEDAS = ["USD", "EUR", "CUP", "MLC"];

// Un acento de color distinto por categoría, para diferenciarlas de un vistazo.
const ACENTOS_CATEGORIA = [
  "border-l-emerald-500",
  "border-l-blue-500",
  "border-l-violet-500",
  "border-l-amber-500",
  "border-l-rose-500",
  "border-l-cyan-500",
  "border-l-fuchsia-500",
  "border-l-lime-600",
  "border-l-slate-500",
];

function ordenarMonedas(monedas: Iterable<string>): string[] {
  return Array.from(new Set(monedas)).sort((a, b) => {
    const ia = ORDEN_MONEDAS.indexOf(a);
    const ib = ORDEN_MONEDAS.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b);
  });
}

/** Siempre "CODIGO monto" (ej. "USD 1,234.56"), nunca símbolo de moneda. */
function formatMonto(codigo: string, monto: number) {
  const numero = new Intl.NumberFormat("es-CU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
  return `${codigo} ${numero}`;
}

function formatNumero(monto: number) {
  return new Intl.NumberFormat("es-CU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
}

/** Quita el "(ci=...)" que se agrega para distinguir personas con nombres repetidos. */
function soloNombre(persona: string): string {
  return persona.replace(/\s*\(ci=[^)]*\)\s*$/, "");
}

function filtrarMontos(montos: MontosPorMoneda, filtro: MonedaFiltro): MontosPorMoneda {
  if (filtro === "todas") return montos;
  return filtro in montos ? { [filtro]: montos[filtro] } : {};
}

function filtrarPorMoneda<T extends { moneda: string }>(items: T[], filtro: MonedaFiltro): T[] {
  return filtro === "todas" ? items : items.filter((i) => i.moneda === filtro);
}

function filtrarIngresos(ingresos: ContabilidadIngresos, filtro: MonedaFiltro): ContabilidadIngresos {
  // Un grupo sin nada en la moneda filtrada se oculta; con "todas" siempre se
  // conserva (puede seguir teniendo movimientos excluidos que sumen 0).
  return {
    por_moneda: filtrarMontos(ingresos.por_moneda, filtro),
    por_tipo: ingresos.por_tipo
      .map((t) => ({ ...t, por_moneda: filtrarMontos(t.por_moneda, filtro) }))
      .filter((t) => filtro === "todas" || Object.keys(t.por_moneda).length > 0),
    por_persona: ingresos.por_persona
      .map((p) => ({ ...p, por_moneda: filtrarMontos(p.por_moneda, filtro) }))
      .filter((p) => filtro === "todas" || Object.keys(p.por_moneda).length > 0),
    movimientos: filtrarPorMoneda(ingresos.movimientos, filtro),
  };
}

function filtrarResumen(resumen: ContabilidadResumen, filtro: MonedaFiltro): ContabilidadResumen {
  const general: ContabilidadGeneral = {
    ingresos: filtrarIngresos(resumen.general.ingresos, filtro),
    gastos: {
      por_moneda: filtrarMontos(resumen.general.gastos.por_moneda, filtro),
      movimientos: filtrarPorMoneda(resumen.general.gastos.movimientos, filtro),
    },
    saldo: { por_moneda: filtrarMontos(resumen.general.saldo.por_moneda, filtro) },
  };
  return {
    ...resumen,
    general,
    por_categoria: resumen.por_categoria.map((c) => ({ ...c, ingresos: filtrarIngresos(c.ingresos, filtro) })),
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Lista vertical alineada por moneda, para las 3 tarjetas de resumen: recibe
 * siempre el mismo `monedas` (unión de las 3 tarjetas) para que USD/EUR/CUP
 * queden en la misma fila en las tres, aunque una tarjeta tenga 0 en alguna.
 */
function MontosPorMonedaLista({ monedas, montos }: { monedas: string[]; montos: MontosPorMoneda }) {
  return (
    <div className="space-y-1">
      {monedas.map((moneda) => (
        <div key={moneda} className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-gray-500">{moneda}</span>
          <span className="tabular-nums text-lg">{formatMonto(moneda, montos[moneda] ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

/** Chips en línea (envuelven), pensados para celdas o cabeceras compactas. */
function MontosPorMonedaLine({ montos }: { montos: MontosPorMoneda }) {
  const monedas = ordenarMonedas(Object.keys(montos));
  if (monedas.length === 0) {
    return <span className="text-gray-400">—</span>;
  }
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {monedas.map((moneda) => (
        <span
          key={moneda}
          className="inline-flex whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-700"
        >
          {formatMonto(moneda, montos[moneda])}
        </span>
      ))}
    </div>
  );
}

type AgrupacionIngresos = "tipo" | "persona";

/** Una fila de movimiento individual, con sus propios controles: incluir/
 * excluir de los totales de este módulo, y mover a otra categoría — ninguno
 * de los dos toca el Pago/PagoVenta/WalletTransaction original. */
function FilaMovimiento({
  m,
  categoriaActual,
  onCambio,
}: {
  m: ContabilidadMovimiento;
  categoriaActual: CategoriaContabilidad;
  onCambio: () => void;
}) {
  const { toast } = useToast();
  const [guardando, setGuardando] = useState(false);

  const cambiarCategoria = async (nueva: string) => {
    if (nueva === categoriaActual || guardando) return;
    setGuardando(true);
    try {
      await ContabilidadFinancieraService.actualizarCategoria(m.id, { categoria: nueva as CategoriaContabilidad });
      onCambio();
    } catch (error: unknown) {
      toast({
        title: "Error al mover el ingreso",
        description: getErrorMessage(error, "No se pudo cambiar la categoría."),
        variant: "destructive",
      });
      setGuardando(false);
    }
  };

  const alternarIncluido = async () => {
    if (guardando) return;
    setGuardando(true);
    try {
      await ContabilidadFinancieraService.actualizarExclusion(m.id, { excluido: !m.excluido });
      onCambio();
    } catch (error: unknown) {
      toast({
        title: "Error al actualizar el ingreso",
        description: getErrorMessage(error, "No se pudo actualizar el ingreso."),
        variant: "destructive",
      });
      setGuardando(false);
    }
  };

  return (
    <tr className={`border-b border-gray-100 last:border-0 ${m.excluido ? "opacity-50" : ""}`}>
      <td className="py-1.5 pr-2 text-gray-600">{m.detalle}</td>
      <td className="py-1.5 pr-2">
        <select
          value={categoriaActual}
          onChange={(e) => cambiarCategoria(e.target.value)}
          disabled={guardando}
          className="text-xs border rounded px-1.5 py-1 bg-white disabled:opacity-50"
        >
          {CATEGORIAS_CONTABILIDAD.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-1.5 pr-2 text-center">
        <button
          type="button"
          onClick={alternarIncluido}
          disabled={guardando}
          title={m.excluido ? "Incluir en los totales de este módulo" : "Excluir de los totales de este módulo"}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
        >
          {m.excluido ? (
            <EyeOff className="h-4 w-4 text-gray-400" />
          ) : (
            <Eye className="h-4 w-4 text-emerald-600" />
          )}
        </button>
      </td>
      <td
        className={`py-1.5 text-right tabular-nums whitespace-nowrap ${
          m.excluido ? "line-through text-gray-400" : "text-gray-800"
        }`}
      >
        {formatMonto(m.moneda, m.monto)}
      </td>
    </tr>
  );
}

/**
 * Lista de grupos (tipo o persona), cada uno desplegable para ver los
 * movimientos individuales que lo componen (ej. qué oferta/cliente pagó qué),
 * con control por movimiento para incluirlo/excluirlo o moverlo de categoría.
 */
function ListaGruposDesglosable({
  grupos,
  movimientos,
  agruparPor,
  categoriaActual,
  onCambio,
}: {
  grupos: { clave: string; etiqueta: string; por_moneda: MontosPorMoneda }[];
  movimientos: ContabilidadMovimiento[];
  agruparPor: AgrupacionIngresos;
  categoriaActual: CategoriaContabilidad;
  onCambio: () => void;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);

  if (grupos.length === 0) {
    return <p className="text-sm text-gray-400 px-3 py-3">Sin datos.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {grupos.map((g) => {
        const detalle = movimientos.filter((m) => (agruparPor === "tipo" ? m.tipo : m.persona) === g.clave);
        const isOpen = abierto === g.clave;
        return (
          <div key={g.clave}>
            <button
              type="button"
              onClick={() => setAbierto(isOpen ? null : g.clave)}
              disabled={detalle.length === 0}
              className="w-full flex items-center justify-between gap-4 px-3 py-2 text-left hover:bg-gray-50 disabled:hover:bg-white"
            >
              <span className="flex items-center gap-2 text-sm text-gray-800">
                {detalle.length > 0 ? (
                  isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  )
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
                {g.etiqueta}
              </span>
              <MontosPorMonedaLine montos={g.por_moneda} />
            </button>

            {isOpen && detalle.length > 0 && (
              <div className="bg-gray-50/70 px-3 py-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400">
                      <th className="text-left font-normal pb-1">Detalle</th>
                      <th className="text-left font-normal pb-1">Categoría</th>
                      <th className="text-center font-normal pb-1">Incluir</th>
                      <th className="text-right font-normal pb-1">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.map((m) => (
                      <FilaMovimiento key={m.id} m={m} categoriaActual={categoriaActual} onCambio={onCambio} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function mesActualYYYYMM(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function primerYUltimoDiaDeMes(mesInput: string): { desde: string; hasta: string } | null {
  if (!mesInput) return null;
  const [anioStr, mesStr] = mesInput.split("-");
  const anio = Number(anioStr);
  const mes = Number(mesStr);
  if (!anio || !mes) return null;
  return { desde: iso(new Date(anio, mes - 1, 1)), hasta: iso(new Date(anio, mes, 0)) };
}

/** Categoría desplegable: fila alineada en columnas (una por moneda, iguales
 * en todas las categorías) para poder comparar de un vistazo, con un acento
 * de color propio para diferenciarla del resto. */
function IngresosDesplegable({
  categoria,
  titulo,
  accento,
  ingresos,
  monedasColumnas,
  abierto,
  onToggle,
  onCambio,
}: {
  categoria: CategoriaContabilidad;
  titulo: string;
  accento: string;
  ingresos: ContabilidadIngresos;
  monedasColumnas: string[];
  abierto: boolean;
  onToggle: () => void;
  onCambio: () => void;
}) {
  const sinDatos = ingresos.movimientos.length === 0;
  const [agrupacion, setAgrupacion] = useState<AgrupacionIngresos>("tipo");
  const columnas = `1.25rem minmax(160px,1fr) repeat(${monedasColumnas.length}, minmax(110px,auto))`;

  return (
    <div className={`border border-l-4 ${accento} rounded-lg overflow-hidden bg-white`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={sinDatos}
        className="w-full grid items-center gap-2 px-3 py-2.5 hover:bg-gray-50/80 disabled:hover:bg-white disabled:cursor-default text-left"
        style={{ gridTemplateColumns: columnas }}
      >
        {sinDatos ? (
          <span />
        ) : abierto ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
        <span className="font-semibold text-gray-800 text-base">{titulo}</span>
        {monedasColumnas.map((m) => (
          <span key={m} className="text-right tabular-nums text-sm text-gray-700">
            {ingresos.por_moneda[m] !== undefined ? formatNumero(ingresos.por_moneda[m]) : ""}
          </span>
        ))}
      </button>

      {abierto && !sinDatos && (
        <div className="border-t bg-gray-50/60">
          <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-white">
            <button
              type="button"
              onClick={() => setAgrupacion("tipo")}
              className={`rounded px-2.5 py-1 text-sm font-medium ${
                agrupacion === "tipo" ? "bg-emerald-700 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Por tipo
            </button>
            <button
              type="button"
              onClick={() => setAgrupacion("persona")}
              className={`rounded px-2.5 py-1 text-sm font-medium ${
                agrupacion === "persona" ? "bg-emerald-700 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Por persona
            </button>
          </div>
          <div className="bg-white">
            {agrupacion === "tipo" ? (
              <ListaGruposDesglosable
                agruparPor="tipo"
                movimientos={ingresos.movimientos}
                categoriaActual={categoria}
                onCambio={onCambio}
                grupos={ingresos.por_tipo.map((t) => ({ clave: t.tipo, etiqueta: t.label, por_moneda: t.por_moneda }))}
              />
            ) : (
              <ListaGruposDesglosable
                agruparPor="persona"
                movimientos={ingresos.movimientos}
                categoriaActual={categoria}
                onCambio={onCambio}
                grupos={ingresos.por_persona.map((p) => ({
                  clave: p.persona,
                  etiqueta: soloNombre(p.persona),
                  por_moneda: p.por_moneda,
                }))}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type AgrupacionGastos = "fecha" | "persona";

function GastosSection({ gastos }: { gastos: ContabilidadGeneral["gastos"] }) {
  const [agrupacion, setAgrupacion] = useState<AgrupacionGastos>("fecha");
  const [abierto, setAbierto] = useState<string | null>(null);

  const porPersona = useMemo(() => {
    const acc = new Map<string, MontosPorMoneda>();
    for (const m of gastos.movimientos) {
      const actual = acc.get(m.persona) ?? {};
      actual[m.moneda] = (actual[m.moneda] ?? 0) + m.monto;
      acc.set(m.persona, actual);
    }
    return Array.from(acc.entries())
      .map(([persona, por_moneda]) => ({ persona, por_moneda }))
      .sort((a, b) => Object.values(b.por_moneda).reduce((s, v) => s + v, 0) - Object.values(a.por_moneda).reduce((s, v) => s + v, 0));
  }, [gastos.movimientos]);

  if (gastos.movimientos.length === 0) {
    return <p className="text-sm text-gray-400 px-1">Sin gastos en este periodo.</p>;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-white">
        <button
          type="button"
          onClick={() => setAgrupacion("fecha")}
          className={`rounded px-2.5 py-1 text-sm font-medium ${
            agrupacion === "fecha" ? "bg-rose-700 text-white" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Por fecha
        </button>
        <button
          type="button"
          onClick={() => setAgrupacion("persona")}
          className={`rounded px-2.5 py-1 text-sm font-medium ${
            agrupacion === "persona" ? "bg-rose-700 text-white" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Por persona
        </button>
      </div>

      {agrupacion === "fecha" ? (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Persona</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Detalle</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Monto</th>
              </tr>
            </thead>
            <tbody>
              {gastos.movimientos.map((m: ContabilidadGastoMovimiento, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 px-3 text-gray-600 whitespace-nowrap">
                    {m.fecha ? new Date(m.fecha).toLocaleString("es-CU", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </td>
                  <td className="py-1.5 px-3 text-gray-800">{soloNombre(m.persona)}</td>
                  <td className="py-1.5 px-3 text-gray-600">{m.detalle}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-gray-800 whitespace-nowrap">
                    {formatMonto(m.moneda, m.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {porPersona.map((p) => {
            const detalle = gastos.movimientos.filter((m) => m.persona === p.persona);
            const isOpen = abierto === p.persona;
            return (
              <div key={p.persona}>
                <button
                  type="button"
                  onClick={() => setAbierto(isOpen ? null : p.persona)}
                  className="w-full flex items-center justify-between gap-4 px-3 py-2 text-left hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2 text-sm text-gray-800">
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    )}
                    {soloNombre(p.persona)}
                  </span>
                  <MontosPorMonedaLine montos={p.por_moneda} />
                </button>
                {isOpen && (
                  <div className="bg-gray-50/70 px-3 py-2">
                    <table className="w-full text-sm">
                      <tbody>
                        {detalle.map((m, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">
                              {m.fecha ? new Date(m.fecha).toLocaleDateString("es-CU") : "—"}
                            </td>
                            <td className="py-1.5 pr-3 text-gray-600">{m.detalle}</td>
                            <td className="py-1.5 text-right tabular-nums text-gray-700 whitespace-nowrap">
                              {formatMonto(m.moneda, m.monto)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ContabilidadSection({ accionExtra }: { accionExtra?: React.ReactNode }) {
  const [modo, setModo] = useState<ModoFiltro>("mes");
  const [mes, setMes] = useState(mesActualYYYYMM());
  const [rango, setRango] = useState(() => primerYUltimoDiaDeMes(mesActualYYYYMM())!);
  const [monedaFiltro, setMonedaFiltro] = useState<MonedaFiltro>("todas");
  const [resumen, setResumen] = useState<ContabilidadResumen | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [billeterasOpen, setBilleterasOpen] = useState(false);
  const [billeteras, setBilleteras] = useState<Awaited<ReturnType<typeof ContabilidadFinancieraService.obtenerBilleteras>> | null>(null);
  const [loadingBilleteras, setLoadingBilleteras] = useState(false);
  const { toast } = useToast();

  const { desde, hasta } = useMemo(() => {
    if (modo === "mes") {
      return primerYUltimoDiaDeMes(mes) ?? rango;
    }
    return rango;
  }, [modo, mes, rango]);

  const cargar = useCallback(async () => {
    if (!desde || !hasta) return;
    setLoading(true);
    try {
      const data = await ContabilidadFinancieraService.obtenerResumen(desde, hasta);
      setResumen(data);
    } catch (error: unknown) {
      toast({
        title: "Error al cargar Contabilidad",
        description: getErrorMessage(error, "No se pudo calcular el resumen de Contabilidad."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, toast]);

  // Carga automática: al entrar (mes actual por defecto) y cada vez que cambia el filtro de fecha.
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta]);

  const abrirBilleteras = async () => {
    setBilleterasOpen(true);
    setLoadingBilleteras(true);
    try {
      const data = await ContabilidadFinancieraService.obtenerBilleteras();
      setBilleteras(data);
    } catch (error: unknown) {
      toast({
        title: "Error al cargar billeteras",
        description: getErrorMessage(error, "No se pudieron cargar las billeteras."),
        variant: "destructive",
      });
    } finally {
      setLoadingBilleteras(false);
    }
  };

  const toggleExpandido = (key: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const monedasDisponibles = useMemo(() => {
    if (!resumen) return [];
    return ordenarMonedas([
      ...Object.keys(resumen.general.ingresos.por_moneda),
      ...Object.keys(resumen.general.gastos.por_moneda),
      ...Object.keys(resumen.general.saldo.por_moneda),
    ]);
  }, [resumen]);

  const resumenMostrado = useMemo(() => {
    if (!resumen) return null;
    return filtrarResumen(resumen, monedaFiltro);
  }, [resumen, monedaFiltro]);

  const columnasMoneda = monedaFiltro === "todas" ? monedasDisponibles : [monedaFiltro];

  const exportarPdf = async () => {
    if (!resumenMostrado) return;
    const filas = [
      {
        categoria: "General (todo)",
        ingresos: Object.entries(resumenMostrado.general.ingresos.por_moneda)
          .map(([m, v]) => formatMonto(m, v))
          .join(" / "),
      },
      ...resumenMostrado.por_categoria.map((c) => ({
        categoria: c.label,
        ingresos:
          Object.entries(c.ingresos.por_moneda)
            .map(([m, v]) => formatMonto(m, v))
            .join(" / ") || "—",
      })),
    ];
    await exportListToPDF({
      title: "Contabilidad — Ingresos",
      subtitle: `Del ${resumenMostrado.inicio.slice(0, 10)} al ${resumenMostrado.fin.slice(0, 10)}`,
      filename: `contabilidad_${desde}_${hasta}`,
      columns: [
        { header: "Categoría", key: "categoria", width: 70 },
        { header: "Ingresos", key: "ingresos", width: 90 },
      ],
      data: filas,
      logoUrl: "/brand/suncar-v1-iso.png",
    });
  };

  return (
    <Card className="border-l-4 border-l-emerald-700">
      <CardContent className="space-y-4 pt-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <button
              type="button"
              onClick={() => setModo("mes")}
              className={`px-3 py-2 text-sm font-medium ${modo === "mes" ? "bg-emerald-700 text-white" : "bg-white text-gray-600"}`}
            >
              Mes
            </button>
            <button
              type="button"
              onClick={() => setModo("rango")}
              className={`px-3 py-2 text-sm font-medium ${modo === "rango" ? "bg-emerald-700 text-white" : "bg-white text-gray-600"}`}
            >
              Rango personalizado
            </button>
          </div>

          {modo === "mes" ? (
            <div>
              <Label htmlFor="contabilidad-mes">Mes</Label>
              <MonthPicker id="contabilidad-mes" value={mes} onChange={setMes} />
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="contabilidad-desde">Desde</Label>
                <Input
                  id="contabilidad-desde"
                  type="date"
                  value={rango.desde}
                  max={rango.hasta}
                  onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="contabilidad-hasta">Hasta</Label>
                <Input
                  id="contabilidad-hasta"
                  type="date"
                  value={rango.hasta}
                  min={rango.desde}
                  onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))}
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="contabilidad-moneda">Moneda</Label>
            <Select value={monedaFiltro} onValueChange={setMonedaFiltro}>
              <SelectTrigger id="contabilidad-moneda" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {monedasDisponibles.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={cargar} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Actualizar
          </Button>
          <Button variant="outline" onClick={exportarPdf} disabled={!resumenMostrado}>
            <FileDown className="h-4 w-4 mr-2" />
            PDF
          </Button>

          {accionExtra && <div className="ml-auto">{accionExtra}</div>}
        </div>

        {resumenMostrado ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border bg-emerald-50/60 p-3">
                <p className="text-sm font-medium text-emerald-800 mb-1">Ingresos totales</p>
                <div className="font-semibold text-emerald-900">
                  <MontosPorMonedaLista monedas={columnasMoneda} montos={resumenMostrado.general.ingresos.por_moneda} />
                </div>
              </div>
              <div className="rounded-lg border bg-rose-50/60 p-3">
                <p className="text-sm font-medium text-rose-800 mb-1">Gastos totales (empresa)</p>
                <div className="font-semibold text-rose-900">
                  <MontosPorMonedaLista monedas={columnasMoneda} montos={resumenMostrado.general.gastos.por_moneda} />
                </div>
              </div>
              <button
                type="button"
                onClick={abrirBilleteras}
                className="rounded-lg border bg-teal-50/60 p-3 text-left hover:bg-teal-100/60 transition-colors"
              >
                <p className="text-sm font-medium text-teal-800 mb-1 flex items-center gap-1.5">
                  Saldo disponible (empresa)
                  <WalletIcon className="h-3.5 w-3.5" />
                </p>
                <div className="font-semibold text-teal-900">
                  <MontosPorMonedaLista monedas={columnasMoneda} montos={resumenMostrado.general.saldo.por_moneda} />
                </div>
              </button>
            </div>

            <div>
              <p className="text-base font-semibold text-gray-700 mb-2">Ingresos por categoría</p>
              {columnasMoneda.length > 0 && (
                <div
                  className="grid items-center gap-2 px-3 pb-1 text-xs font-semibold text-gray-400 uppercase"
                  style={{ gridTemplateColumns: `1.25rem minmax(160px,1fr) repeat(${columnasMoneda.length}, minmax(110px,auto))` }}
                >
                  <span />
                  <span>Categoría</span>
                  {columnasMoneda.map((m) => (
                    <span key={m} className="text-right">
                      {m}
                    </span>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {resumenMostrado.por_categoria.map((c, i) => (
                  <IngresosDesplegable
                    key={c.categoria}
                    categoria={c.categoria}
                    titulo={c.label}
                    accento={ACENTOS_CATEGORIA[i % ACENTOS_CATEGORIA.length]}
                    ingresos={c.ingresos}
                    monedasColumnas={columnasMoneda}
                    abierto={expandidos.has(c.categoria)}
                    onToggle={() => toggleExpandido(c.categoria)}
                    onCambio={cargar}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-base font-semibold text-gray-700 mb-2">Gastos</p>
              <GastosSection gastos={resumenMostrado.general.gastos} />
            </div>
          </div>
        ) : loading ? (
          <div className="py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-700" />
          </div>
        ) : null}
      </CardContent>

      <Dialog open={billeterasOpen} onOpenChange={setBilleterasOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Billeteras con saldo</DialogTitle>
          </DialogHeader>
          {loadingBilleteras ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-teal-700" />
            </div>
          ) : billeteras && billeteras.billeteras.length > 0 ? (
            <div className="space-y-3">
              <div className="rounded-lg border bg-teal-50/60 p-3">
                <p className="text-sm font-medium text-teal-800 mb-1">Total en billeteras</p>
                <MontosPorMonedaLista monedas={ordenarMonedas(Object.keys(billeteras.por_moneda))} montos={billeteras.por_moneda} />
              </div>
              <div className="divide-y divide-gray-100 border rounded-lg">
                {billeteras.billeteras.map((b) => (
                  <div key={b.persona} className="flex items-center justify-between gap-4 px-3 py-2">
                    <span className="text-sm text-gray-800">{soloNombre(b.persona)}</span>
                    <MontosPorMonedaLine montos={b.por_moneda} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4">Ninguna billetera tiene saldo actualmente.</p>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
