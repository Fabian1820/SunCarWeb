"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FileDown,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Switch } from "@/components/shared/molecule/switch";
import { MonthPicker } from "@/components/shared/molecule/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { ToastAction } from "@/components/shared/molecule/toast";
import { useToast } from "@/hooks/use-toast";
import { ContabilidadFinancieraService } from "@/lib/api-services";
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
type Vista = "ingresos" | "gastos" | "saldo";

const ORDEN_MONEDAS = ["USD", "EUR", "CUP", "MLC"];

// Paleta estable por posición de categoría — se usa tanto en el gráfico de
// distribución como en los puntos de color de la leyenda.
const PALETA_CATEGORIA = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#d946ef", // fuchsia
  "#84cc16", // lime
  "#94a3b8", // slate
];

type CategoriaOpcion = { value: string; label: string };

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

/**
 * Marcador de resumen: Ingresos / Gastos / Saldo disponible en un solo panel
 * oscuro tipo tablero, con el segmento activo resaltado por una línea de
 * acento abajo — reemplaza las 3 tarjetas sueltas de antes.
 */
const SEGMENTOS_SCOREBOARD: { key: Vista; label: string; icon: typeof TrendingUp; barra: string }[] = [
  { key: "ingresos", label: "Ingresos", icon: TrendingUp, barra: "bg-emerald-400" },
  { key: "gastos", label: "Gastos", icon: TrendingDown, barra: "bg-rose-400" },
  { key: "saldo", label: "Saldo disponible", icon: WalletIcon, barra: "bg-sky-400" },
];

function ResumenScoreboard({
  monedas,
  valores,
  vista,
  onSeleccionar,
}: {
  monedas: string[];
  valores: Record<Vista, MontosPorMoneda>;
  vista: Vista;
  onSeleccionar: (v: Vista) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
        {SEGMENTOS_SCOREBOARD.map((s) => {
          const Icon = s.icon;
          const activo = vista === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onSeleccionar(s.key)}
              className={`relative px-5 py-5 text-left transition-colors ${activo ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">{s.label}</span>
                <Icon className={`h-4 w-4 transition-colors ${activo ? "text-white/80" : "text-white/30"}`} />
              </div>
              <div className="mt-3 space-y-1">
                {monedas.map((m) => (
                  <div key={m} className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] font-medium text-white/35">{m}</span>
                    <span className="text-2xl font-semibold tabular-nums tracking-tight text-white">
                      {formatNumero(valores[s.key][m] ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
              <span
                className={`absolute inset-x-5 bottom-0 h-0.5 rounded-full transition-opacity ${s.barra} ${activo ? "opacity-100" : "opacity-0"}`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Gráfico de pastel de la distribución de ingresos por categoría en una
 * sola moneda (mezclar monedas en un pastel no tiene sentido), con leyenda
 * clicable debajo que también selecciona la categoría. */
function DistribucionIngresosPie({
  datos,
  seleccionada,
  onSeleccionar,
  moneda,
  colorDe,
}: {
  datos: { codigo: string; label: string; valor: number }[];
  seleccionada: string | null;
  onSeleccionar: (codigo: string) => void;
  moneda: string;
  colorDe: (codigo: string) => string;
}) {
  const total = datos.reduce((s, d) => s + d.valor, 0);

  if (datos.length === 0 || total <= 0) {
    return <p className="py-14 text-center text-base text-gray-400">Sin ingresos que graficar en {moneda}.</p>;
  }

  return (
    <div>
      <div className="relative h-60 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datos}
              dataKey="valor"
              nameKey="label"
              innerRadius="62%"
              outerRadius="94%"
              paddingAngle={2}
              stroke="none"
              onClick={(_, index) => onSeleccionar(datos[index].codigo)}
              isAnimationActive
              animationDuration={500}
            >
              {datos.map((d) => (
                <Cell
                  key={d.codigo}
                  fill={colorDe(d.codigo)}
                  className="cursor-pointer outline-none"
                  opacity={seleccionada === null || seleccionada === d.codigo ? 1 : 0.32}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatMonto(moneda, value)}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Total {moneda}</span>
          <span className="text-xl font-semibold tabular-nums text-gray-800">{formatNumero(total)}</span>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {datos.map((d) => (
          <button
            key={d.codigo}
            type="button"
            onClick={() => onSeleccionar(d.codigo)}
            className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors ${
              seleccionada === d.codigo ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2 text-base text-gray-700">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorDe(d.codigo) }} />
              <span className="truncate">{d.label}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="tabular-nums text-sm text-gray-400">{Math.round((d.valor / total) * 100)}%</span>
              <span className="tabular-nums text-base font-medium text-gray-800">{formatNumero(d.valor)}</span>
            </span>
          </button>
        ))}
      </div>
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
  categoriasDisponibles,
  onCambio,
}: {
  m: ContabilidadMovimiento;
  categoriaActual: CategoriaContabilidad;
  categoriasDisponibles: CategoriaOpcion[];
  onCambio: () => void;
}) {
  const { toast } = useToast();
  const [guardando, setGuardando] = useState(false);
  const movido = m.categoria_automatica !== categoriaActual;
  const labelDe = (codigo: string) => categoriasDisponibles.find((c) => c.value === codigo)?.label ?? codigo;

  const cambiarCategoria = async (nueva: string, opts?: { silencioso?: boolean }) => {
    if (nueva === categoriaActual || guardando) return;
    const anterior = categoriaActual;
    setGuardando(true);
    try {
      await ContabilidadFinancieraService.actualizarCategoria(m.id, { categoria: nueva as CategoriaContabilidad });
      onCambio();
      if (!opts?.silencioso) {
        toast({
          title: "Ingreso movido de categoría",
          description: `"${m.detalle}" ahora cuenta en ${labelDe(nueva)}.`,
          action: (
            <ToastAction altText="Deshacer" onClick={() => cambiarCategoria(anterior, { silencioso: true })}>
              Deshacer
            </ToastAction>
          ),
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Error al mover el ingreso",
        description: getErrorMessage(error, "No se pudo cambiar la categoría."),
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  const alternarIncluido = async (incluir: boolean, opts?: { silencioso?: boolean }) => {
    if (guardando) return;
    setGuardando(true);
    try {
      await ContabilidadFinancieraService.actualizarExclusion(m.id, { excluido: !incluir });
      onCambio();
      if (!opts?.silencioso) {
        toast({
          title: incluir ? "Ingreso incluido de nuevo" : "Ingreso excluido de los totales",
          description: incluir
            ? `"${m.detalle}" vuelve a sumar en este módulo.`
            : `"${m.detalle}" ya no suma aquí. El dato original (Pago/Wallet) no cambia; el resto del sistema lo sigue usando igual.`,
          action: (
            <ToastAction altText="Deshacer" onClick={() => alternarIncluido(!incluir, { silencioso: true })}>
              Deshacer
            </ToastAction>
          ),
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Error al actualizar el ingreso",
        description: getErrorMessage(error, "No se pudo actualizar el ingreso."),
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <tr className={`border-b border-gray-100 last:border-0 ${m.excluido ? "opacity-50" : ""}`}>
      <td className="py-2.5 pr-3 text-gray-700 align-top text-base">
        <div>{m.detalle}</div>
        {movido && (
          <div className="flex flex-wrap items-center gap-1 text-sm text-amber-700 mt-1">
            <span>Movido: {labelDe(m.categoria_automatica)}</span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="font-medium">{labelDe(categoriaActual)}</span>
          </div>
        )}
      </td>
      <td className="py-2.5 pr-3 align-top">
        <select
          value={categoriaActual}
          onChange={(e) => cambiarCategoria(e.target.value)}
          disabled={guardando}
          className="text-sm border rounded px-2 py-1.5 bg-white disabled:opacity-50"
        >
          {categoriasDisponibles.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2.5 pr-3 align-top">
        <div
          className="flex items-center gap-2"
          title="Si lo excluyes, deja de sumar en los totales de este módulo (categoría y general), pero el Pago/Wallet original no se toca y el resto del sistema lo sigue usando igual. Se puede deshacer en cualquier momento."
        >
          <Switch
            checked={!m.excluido}
            onCheckedChange={(checked: boolean) => alternarIncluido(checked)}
            disabled={guardando}
          />
          <span className={`text-sm font-medium whitespace-nowrap ${m.excluido ? "text-gray-400" : "text-emerald-700"}`}>
            {m.excluido ? "Excluido de los totales" : "Incluido en los totales"}
          </span>
        </div>
      </td>
      <td
        className={`py-2.5 text-right tabular-nums whitespace-nowrap align-top text-base ${
          m.excluido ? "line-through text-gray-400" : "text-gray-800"
        }`}
      >
        {formatMonto(m.moneda, m.monto)}
      </td>
    </tr>
  );
}

function TablaMovimientos({
  movimientos,
  categoriaActual,
  categoriasDisponibles,
  onCambio,
}: {
  movimientos: ContabilidadMovimiento[];
  categoriaActual: CategoriaContabilidad;
  categoriasDisponibles: CategoriaOpcion[];
  onCambio: () => void;
}) {
  return (
    <table className="w-full text-base">
      <thead>
        <tr className="text-sm text-gray-500 bg-gray-50">
          <th className="text-left font-semibold py-2 px-3">Detalle</th>
          <th className="text-left font-semibold py-2 px-3">Categoría</th>
          <th className="text-left font-semibold py-2 px-3">¿Cuenta en el total?</th>
          <th className="text-right font-semibold py-2 px-3">Monto</th>
        </tr>
      </thead>
      <tbody>
        {movimientos.map((m) => (
          <FilaMovimiento
            key={m.id}
            m={m}
            categoriaActual={categoriaActual}
            categoriasDisponibles={categoriasDisponibles}
            onCambio={onCambio}
          />
        ))}
      </tbody>
    </table>
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
  categoriasDisponibles,
  onCambio,
}: {
  grupos: { clave: string; etiqueta: string; por_moneda: MontosPorMoneda }[];
  movimientos: ContabilidadMovimiento[];
  agruparPor: AgrupacionIngresos;
  categoriaActual: CategoriaContabilidad;
  categoriasDisponibles: CategoriaOpcion[];
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
              <span className="flex items-center gap-2 text-base text-gray-800">
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
                <TablaMovimientos
                  movimientos={detalle}
                  categoriaActual={categoriaActual}
                  categoriasDisponibles={categoriasDisponibles}
                  onCambio={onCambio}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Detalle de la categoría elegida en el gráfico: se ajusta solo según los
 * datos — una categoría de una sola persona (ej. Director) va directo a la
 * lista de movimientos sin agrupar nada; una con un solo tipo de ingreso
 * (ej. Socios/CEO, todo Wallet) agrupa por persona sin ofrecer "Por tipo". */
function PanelCategoriaSeleccionada({
  label,
  categoria,
  ingresos,
  categoriasDisponibles,
  onCambio,
}: {
  label: string;
  categoria: string;
  ingresos: ContabilidadIngresos;
  categoriasDisponibles: CategoriaOpcion[];
  onCambio: () => void;
}) {
  const soloUnaPersona = ingresos.por_persona.length <= 1;
  const soloUnTipo = ingresos.por_tipo.length <= 1;
  const [agrupacion, setAgrupacion] = useState<AgrupacionIngresos>(soloUnTipo ? "persona" : "tipo");

  useEffect(() => {
    setAgrupacion(soloUnTipo ? "persona" : "tipo");
  }, [categoria, soloUnTipo]);

  return (
    <div key={categoria} className="animate-fade-in">
      <p className="text-base font-semibold text-gray-800 mb-3">{label}</p>

      {ingresos.movimientos.length === 0 ? (
        <p className="rounded-lg border py-10 text-center text-base text-gray-400">
          Sin ingresos en esta categoría para el periodo.
        </p>
      ) : soloUnaPersona ? (
        <div className="border rounded-lg overflow-hidden">
          <TablaMovimientos
            movimientos={ingresos.movimientos}
            categoriaActual={categoria}
            categoriasDisponibles={categoriasDisponibles}
            onCambio={onCambio}
          />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {!soloUnTipo && (
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
          )}
          <ListaGruposDesglosable
            agruparPor={agrupacion}
            movimientos={ingresos.movimientos}
            categoriaActual={categoria}
            categoriasDisponibles={categoriasDisponibles}
            onCambio={onCambio}
            grupos={
              agrupacion === "tipo"
                ? ingresos.por_tipo.map((t) => ({ clave: t.tipo, etiqueta: t.label, por_moneda: t.por_moneda }))
                : ingresos.por_persona.map((p) => ({ clave: p.persona, etiqueta: soloNombre(p.persona), por_moneda: p.por_moneda }))
            }
          />
        </div>
      )}
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
                  <span className="flex items-center gap-2 text-base text-gray-800">
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
  const [vista, setVista] = useState<Vista>("ingresos");
  const [monedaPie, setMonedaPie] = useState("USD");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
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

  const seleccionarVista = async (v: Vista) => {
    setVista(v);
    if (v === "saldo" && !billeteras) {
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
    }
  };

  const monedasDisponibles = useMemo(() => {
    if (!resumen) return [];
    return ordenarMonedas([
      ...Object.keys(resumen.general.ingresos.por_moneda),
      ...Object.keys(resumen.general.gastos.por_moneda),
      ...Object.keys(resumen.general.saldo.por_moneda),
    ]);
  }, [resumen]);

  // La moneda del pastel se ajusta sola si la elegida ya no aparece en el periodo.
  useEffect(() => {
    if (monedasDisponibles.length > 0 && !monedasDisponibles.includes(monedaPie)) {
      setMonedaPie(monedasDisponibles[0]);
    }
  }, [monedasDisponibles, monedaPie]);

  const resumenMostrado = useMemo(() => {
    if (!resumen) return null;
    return filtrarResumen(resumen, monedaFiltro);
  }, [resumen, monedaFiltro]);

  const columnasMoneda = monedaFiltro === "todas" ? monedasDisponibles : [monedaFiltro];

  // Las categorías vienen del propio resumen (siempre trae todas, incluso
  // sin movimientos) — evita otra llamada al backend solo para el <select>.
  const categoriasDisponibles: CategoriaOpcion[] = useMemo(
    () => resumen?.por_categoria.map((c) => ({ value: c.categoria, label: c.label })) ?? [],
    [resumen],
  );

  const colorDeCategoria = useCallback(
    (codigo: string) => {
      const idx = categoriasDisponibles.findIndex((c) => c.value === codigo);
      return PALETA_CATEGORIA[(idx < 0 ? 0 : idx) % PALETA_CATEGORIA.length];
    },
    [categoriasDisponibles],
  );

  const datosPie = useMemo(() => {
    if (!resumen) return [];
    return resumen.por_categoria
      .map((c) => ({ codigo: c.categoria, label: c.label, valor: c.ingresos.por_moneda[monedaPie] ?? 0 }))
      .filter((d) => d.valor > 0);
  }, [resumen, monedaPie]);

  // Elige una categoría por defecto (la más grande en la moneda del pastel)
  // solo la primera vez; después la elección del usuario se conserva aunque
  // cambien el periodo o el filtro.
  useEffect(() => {
    if (!resumen || categoriaSeleccionada !== null) return;
    const mejor = [...resumen.por_categoria].sort(
      (a, b) => (b.ingresos.por_moneda[monedaPie] ?? 0) - (a.ingresos.por_moneda[monedaPie] ?? 0),
    )[0];
    setCategoriaSeleccionada(mejor?.categoria ?? null);
  }, [resumen, monedaPie, categoriaSeleccionada]);

  const categoriaSeleccionadaResumen = resumenMostrado?.por_categoria.find((c) => c.categoria === categoriaSeleccionada) ?? null;

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
    <Card>
      <CardContent className="space-y-5 pt-4">
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
            <ResumenScoreboard
              monedas={columnasMoneda}
              valores={{
                ingresos: resumenMostrado.general.ingresos.por_moneda,
                gastos: resumenMostrado.general.gastos.por_moneda,
                saldo: resumenMostrado.general.saldo.por_moneda,
              }}
              vista={vista}
              onSeleccionar={seleccionarVista}
            />

            {vista === "ingresos" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="text-base font-semibold text-gray-800">Distribución de ingresos</p>
                    {monedasDisponibles.length > 1 && (
                      <div className="flex rounded-md border overflow-hidden text-sm shrink-0">
                        {monedasDisponibles.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMonedaPie(m)}
                            className={`px-2.5 py-1 font-medium ${monedaPie === m ? "bg-emerald-700 text-white" : "bg-white text-gray-600"}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <DistribucionIngresosPie
                    datos={datosPie}
                    seleccionada={categoriaSeleccionada}
                    onSeleccionar={setCategoriaSeleccionada}
                    moneda={monedaPie}
                    colorDe={colorDeCategoria}
                  />
                </div>

                <div className="rounded-xl border p-4">
                  {categoriaSeleccionadaResumen ? (
                    <PanelCategoriaSeleccionada
                      label={categoriaSeleccionadaResumen.label}
                      categoria={categoriaSeleccionadaResumen.categoria}
                      ingresos={categoriaSeleccionadaResumen.ingresos}
                      categoriasDisponibles={categoriasDisponibles}
                      onCambio={cargar}
                    />
                  ) : (
                    <p className="py-10 text-center text-base text-gray-400">Elige una categoría en el gráfico.</p>
                  )}
                </div>
              </div>
            )}

            {vista === "gastos" && (
              <div>
                <p className="text-base font-semibold text-gray-700 mb-2">Gastos</p>
                <GastosSection gastos={resumenMostrado.general.gastos} />
              </div>
            )}

            {vista === "saldo" && (
              <div>
                <p className="text-base font-semibold text-gray-700 mb-2">Billeteras con saldo</p>
                {loadingBilleteras ? (
                  <div className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-teal-700" />
                  </div>
                ) : billeteras && billeteras.billeteras.length > 0 ? (
                  <div className="divide-y divide-gray-100 border rounded-lg">
                    {billeteras.billeteras.map((b) => (
                      <div key={b.persona} className="flex items-center justify-between gap-4 px-3 py-2">
                        <span className="text-sm text-gray-800">{soloNombre(b.persona)}</span>
                        <MontosPorMonedaLine montos={b.por_moneda} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4">Ninguna billetera tiene saldo actualmente.</p>
                )}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-700" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
