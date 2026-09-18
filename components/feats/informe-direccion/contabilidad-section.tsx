"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FileDown,
  Loader2,
  PieChart as PieChartIcon,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
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
/** Pseudo-moneda de los gráficos: el "general de todo" en USD. No convierte
 * nada con tasas de hoy — usa el USD que el sistema guardó en cada cobro. */
const MONEDA_TOTAL = "TOTAL";
const MESES_TENDENCIA = 6;

// Marca Suncar 2026 (tailwind.config.ts → colors.brand)
const MARCA = {
  emerald: "#012928", // Emerald Circuit
  volt: "#AFEB17", // Volt Green
  solar: "#F2C300", // Solar Radiance
  midnight: "#0A052D", // Midnight Voltage
  clean: "#E6F4EF", // Clean Current
};

// Paleta viva anclada en la marca: incluso una porción finísima del pastel
// se distingue. El orden es estable por posición de categoría.
const PALETA_CATEGORIA = [
  "#AFEB17", // Volt Green (marca)
  "#00B894", // esmeralda viva
  "#F2C300", // Solar Radiance (marca)
  "#3B5BDB", // azul vivo (familia Midnight)
  "#FF7A1A", // naranja vivo
  "#E84393", // magenta vivo
  "#00CFE8", // cian vivo
  "#7C5CFC", // violeta vivo
  "#E11D48", // carmín vivo
];

type CategoriaOpcion = { value: string; label: string };
type PuntoTendencia = { mes: string; ingresos: number; gastos: number };

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

/** Etiquetas cortas para el eje Y del gráfico de tendencia. */
function formatNumeroCorto(valor: number) {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(valor / 1_000)}k`;
  return String(Math.round(valor));
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
    total_usd: ingresos.total_usd,
    sin_convertir: ingresos.sin_convertir,
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

/** Serie de los últimos meses para los gráficos de tendencia. Reusa el mismo
 * endpoint del resumen, un mes por punto, en paralelo. */
async function obtenerTendenciaMensual(moneda: string, meses = MESES_TENDENCIA): Promise<PuntoTendencia[]> {
  const hoy = new Date();
  const periodos = Array.from({ length: meses }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 1 - i), 1);
    return {
      mes: d.toLocaleDateString("es-CU", { month: "short" }).replace(".", ""),
      desde: iso(new Date(d.getFullYear(), d.getMonth(), 1)),
      hasta: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
    };
  });
  const resumenes = await Promise.all(periodos.map((p) => ContabilidadFinancieraService.obtenerResumen(p.desde, p.hasta)));
  // Un mes que venga con forma inesperada cuenta 0 en vez de tumbar el gráfico.
  return periodos.map((p, i) => ({
    mes: p.mes,
    ingresos:
      moneda === MONEDA_TOTAL
        ? resumenes[i]?.general?.ingresos?.total_usd ?? 0
        : resumenes[i]?.general?.ingresos?.por_moneda?.[moneda] ?? 0,
    gastos: resumenes[i]?.general?.gastos?.por_moneda?.[moneda] ?? 0,
  }));
}

/** El backend puede responder con un objeto de error (apiRequest convierte
 * los 400 en `{success:false,...}` en vez de lanzar), así que se valida la
 * forma antes de usarla — si no, la vista entera se cae en blanco. */
function esResumenValido(data: unknown): data is ContabilidadResumen {
  const r = data as ContabilidadResumen | undefined;
  return Boolean(r?.general?.ingresos?.por_moneda && r?.general?.gastos && Array.isArray(r?.por_categoria));
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

/* ── Tarjetas de resumen (colores de marca) ──────────────────────────── */

const TARJETAS: {
  key: Vista;
  label: string;
  icon: typeof TrendingUp;
  superficie: string;
  anillo: string;
  chip: string;
  valor: string;
  etiqueta: string;
}[] = [
  {
    key: "ingresos",
    label: "Ingresos",
    icon: TrendingUp,
    superficie: "bg-[#E6F4EF]",
    anillo: "ring-[#AFEB17]",
    chip: "bg-[#AFEB17] text-[#012928]",
    valor: "text-[#012928]",
    etiqueta: "text-[#012928]/70",
  },
  {
    key: "gastos",
    label: "Gastos",
    icon: TrendingDown,
    superficie: "bg-[#FDF5DC]",
    anillo: "ring-[#F2C300]",
    chip: "bg-[#F2C300] text-[#012928]",
    valor: "text-[#5C4300]",
    etiqueta: "text-[#5C4300]/75",
  },
  {
    key: "saldo",
    label: "Saldo disponible",
    icon: WalletIcon,
    superficie: "bg-[#ECEEF8]",
    anillo: "ring-[#0A052D]",
    chip: "bg-[#0A052D] text-white",
    valor: "text-[#0A052D]",
    etiqueta: "text-[#0A052D]/70",
  },
];

function TarjetasResumen({
  monedas,
  valores,
  totalIngresosUsd,
  sinConvertir,
  vista,
  onSeleccionar,
}: {
  monedas: string[];
  valores: Record<Vista, MontosPorMoneda>;
  /** "General de todo" de los ingresos; null cuando hay filtro de moneda. */
  totalIngresosUsd: number | null;
  sinConvertir: MontosPorMoneda;
  vista: Vista;
  onSeleccionar: (v: Vista) => void;
}) {
  const monedasSinConvertir = ordenarMonedas(Object.keys(sinConvertir));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {TARJETAS.map((t) => {
        const Icon = t.icon;
        const activo = vista === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onSeleccionar(t.key)}
            className={`flex flex-col rounded-2xl ${t.superficie} p-5 text-left shadow-[0_12px_28px_-20px_rgba(1,41,40,0.5)] transition-all ${
              activo ? `ring-2 ${t.anillo}` : "ring-1 ring-black/5 hover:ring-black/15"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`text-xs font-semibold uppercase tracking-[0.14em] ${t.etiqueta}`}>{t.label}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${t.chip}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4 space-y-1.5">
              {monedas.map((m) => (
                <div key={m} className="flex items-baseline justify-between gap-3">
                  <span className={`text-xs font-semibold ${t.etiqueta}`}>{m}</span>
                  <span className={`text-2xl font-semibold tabular-nums tracking-tight ${t.valor}`}>
                    {formatNumero(valores[t.key][m] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
            {t.key === "ingresos" && totalIngresosUsd !== null && (
              <div className="mt-3 border-t border-[#012928]/15 pt-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`text-xs font-semibold uppercase tracking-[0.14em] ${t.etiqueta}`}>Total USD</span>
                  <span className={`text-2xl font-semibold tabular-nums tracking-tight ${t.valor}`}>
                    {formatNumero(totalIngresosUsd)}
                  </span>
                </div>
                <p className={`mt-1 text-[11px] ${t.etiqueta}`}>
                  Todas las monedas juntas, con la tasa de cada cobro
                  {monedasSinConvertir.length > 0
                    ? ` · sin incluir ${monedasSinConvertir.map((m) => formatMonto(m, sinConvertir[m])).join(" y ")} sin tasa guardada`
                    : ""}
                </p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Gráficos ────────────────────────────────────────────────────────── */

function PanelGrafico({
  titulo,
  icono: Icono,
  acciones,
  children,
}: {
  titulo: string;
  icono: typeof PieChartIcon;
  acciones?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-[0_12px_28px_-24px_rgba(1,41,40,0.45)]">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icono className="h-4 w-4 text-[#012928]" />
          <h3 className="text-base font-semibold text-[#012928]">{titulo}</h3>
        </div>
        {acciones}
      </header>
      {children}
    </div>
  );
}

const RADIAN = Math.PI / 180;
/** Geometría del pastel 3D: elipse en perspectiva + pared extruida. */
const ALTO_PASTEL = 390;
const RADIO_X = 152;
const RADIO_Y = 68;
const PROFUNDIDAD = 34;
const CENTRO_Y = 172;
/** Separación vertical mínima entre etiquetas del mismo lado. */
const SEPARACION_ETIQUETA = 36;
/** Piso visual: una categoría minúscula ocupa al menos esta fracción del
 * pastel para que se pueda ver y tocar. El monto y el % mostrados son los
 * reales — solo el ancho de la porción tiene mínimo. */
const PISO_PORCION = 0.035;

/** Sombra de la pared lateral: el mismo color, más oscuro. */
function oscurecer(hex: string, factor: number) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (desplazamiento: number) =>
    Math.max(0, Math.min(255, Math.round(((n >> desplazamiento) & 255) * factor)));
  const rgb = (canal(16) << 16) | (canal(8) << 8) | canal(0);
  return `#${(rgb | 0x1000000).toString(16).slice(1)}`;
}

function puntoElipse(cx: number, cy: number, rx: number, ry: number, grados: number) {
  return { x: cx + rx * Math.cos(grados * RADIAN), y: cy - ry * Math.sin(grados * RADIAN) };
}

/** Recorta el nombre al ancho disponible (SVG no ajusta texto solo). */
function recortarTexto(texto: string, anchoPx: number) {
  const maximo = Math.max(8, Math.floor(anchoPx / 6.6));
  return texto.length <= maximo ? texto : `${texto.slice(0, maximo - 1)}…`;
}

type PorcionPastel = {
  codigo: string;
  label: string;
  valor: number;
  porcentaje: number;
  inicio: number;
  fin: number;
  medio: number;
};

/** Pastel 3D en perspectiva, con el nombre, el monto y el % de cada
 * categoría sobre el propio gráfico unidos por una línea guía. */
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
  const contenedor = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);

  // El SVG se dibuja en píxeles (no en %) para que las líneas guía caigan
  // exactamente sobre su porción, así que hace falta medir el contenedor.
  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    setAncho(nodo.getBoundingClientRect().width);
    const observador = new ResizeObserver(([entrada]) => setAncho(entrada.contentRect.width));
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  const total = datos.reduce((suma, d) => suma + d.valor, 0);

  // Ángulos propios (no los de recharts) para poder anclar etiquetas y
  // aplicar el piso visual de las porciones finas.
  const porciones = useMemo<PorcionPastel[]>(() => {
    if (total <= 0) return [];
    const piso = total * PISO_PORCION;
    const conPiso = datos.map((d) => ({ ...d, valorGrafico: Math.max(d.valor, piso) }));
    const totalGrafico = conPiso.reduce((suma, d) => suma + d.valorGrafico, 0);
    let acumulado = 0;
    return conPiso.map((d) => {
      const inicio = 90 - (acumulado / totalGrafico) * 360;
      acumulado += d.valorGrafico;
      const fin = 90 - (acumulado / totalGrafico) * 360;
      return {
        codigo: d.codigo,
        label: d.label,
        valor: d.valor,
        porcentaje: (d.valor / total) * 100,
        inicio,
        fin,
        medio: (inicio + fin) / 2,
      };
    });
  }, [datos, total]);

  // En pantallas estrechas no cabe una etiqueta a cada lado: el pastel se
  // encoge y los nombres pasan a una leyenda debajo.
  const compacto = ancho > 0 && ancho < 620;
  const cx = ancho / 2;
  const rx = compacto ? Math.max(68, Math.min(RADIO_X, ancho / 2 - 22)) : RADIO_X;
  const ry = (rx * RADIO_Y) / RADIO_X;
  const profundidad = (rx * PROFUNDIDAD) / RADIO_X;
  const cy = compacto ? ry + 24 : CENTRO_Y;
  const alto = compacto ? Math.round(cy + ry + profundidad + 16) : ALTO_PASTEL;

  // Etiquetas: se reparten a izquierda/derecha y se separan para no pisarse.
  const etiquetas = useMemo(() => {
    const porLado: Record<"izq" | "der", { indice: number; y: number }[]> = { izq: [], der: [] };
    porciones.forEach((p, indice) => {
      const seno = Math.sin(p.medio * RADIAN);
      const lado = Math.cos(p.medio * RADIAN) >= 0 ? "der" : "izq";
      porLado[lado].push({ indice, y: cy - (ry + 16) * seno + (seno < 0 ? profundidad : 0) });
    });
    const posiciones: Record<number, { y: number; lado: "izq" | "der" }> = {};
    (["izq", "der"] as const).forEach((lado) => {
      const items = [...porLado[lado]].sort((a, b) => a.y - b.y);
      let ultimo = -Infinity;
      items.forEach(({ indice, y }) => {
        const yFinal = Math.max(y, ultimo + SEPARACION_ETIQUETA);
        posiciones[indice] = { y: yFinal, lado };
        ultimo = yFinal;
      });
      const desborde = ultimo - (alto - 20);
      if (desborde > 0) {
        const primera = items.length > 0 ? posiciones[items[0].indice].y : 0;
        const ajuste = Math.min(desborde, primera - 20);
        if (ajuste > 0) items.forEach(({ indice }) => (posiciones[indice].y -= ajuste));
      }
    });
    return posiciones;
  }, [porciones, cy, ry, profundidad, alto]);

  if (datos.length === 0 || total <= 0) {
    return <p className="py-16 text-center text-base text-gray-400">Sin ingresos que graficar en {moneda}.</p>;
  }

  /** Cara superior de la porción (elipse en perspectiva). */
  const caraSuperior = (p: PorcionPastel) => {
    const a = puntoElipse(cx, cy, rx, ry, p.inicio);
    const b = puntoElipse(cx, cy, rx, ry, p.fin);
    const arcoGrande = p.inicio - p.fin > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${a.x} ${a.y} A ${rx} ${ry} 0 ${arcoGrande} 1 ${b.x} ${b.y} Z`;
  };

  /** Pared lateral: solo la parte de la porción que mira al frente. */
  const paredLateral = (p: PorcionPastel) => {
    const desde = Math.min(p.inicio, 0);
    const hasta = Math.max(p.fin, -180);
    if (desde <= hasta) return null;
    const a = puntoElipse(cx, cy, rx, ry, desde);
    const b = puntoElipse(cx, cy, rx, ry, hasta);
    return [
      `M ${a.x} ${a.y}`,
      `A ${rx} ${ry} 0 0 1 ${b.x} ${b.y}`,
      `L ${b.x} ${b.y + profundidad}`,
      `A ${rx} ${ry} 0 0 0 ${a.x} ${a.y + profundidad}`,
      "Z",
    ].join(" ");
  };

  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total {moneda}</span>
        <span className="text-xl font-semibold tabular-nums text-[#012928]">{formatNumero(total)}</span>
      </div>

      <div ref={contenedor} className="relative w-full" style={{ height: alto }}>
        {ancho > 0 && (
          <svg width={ancho} height={alto} className="block">
            <defs>
              <filter id="pastel-sombra" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="7" />
              </filter>
            </defs>

            <ellipse
              cx={cx}
              cy={cy + profundidad + 10}
              rx={rx * 0.98}
              ry={ry * 0.82}
              fill="rgba(1,41,40,0.18)"
              filter="url(#pastel-sombra)"
            />

            {/* Paredes primero: las caras superiores van encima. */}
            {porciones.map((p) => {
              const pared = paredLateral(p);
              if (!pared) return null;
              const desplazada = seleccionada === p.codigo;
              return (
                <path
                  key={`pared-${p.codigo}`}
                  d={pared}
                  fill={oscurecer(colorDe(p.codigo), 0.68)}
                  transform={
                    desplazada
                      ? `translate(${rx * 0.065 * Math.cos(p.medio * RADIAN)}, ${-ry * 0.09 * Math.sin(p.medio * RADIAN)})`
                      : undefined
                  }
                />
              );
            })}

            {porciones.map((p) => {
              const desplazada = seleccionada === p.codigo;
              return (
                <path
                  key={`cara-${p.codigo}`}
                  d={caraSuperior(p)}
                  fill={colorDe(p.codigo)}
                  stroke="#ffffff"
                  strokeWidth={desplazada ? 3 : 1.5}
                  className="cursor-pointer outline-none"
                  onClick={() => onSeleccionar(p.codigo)}
                  transform={
                    desplazada
                      ? `translate(${rx * 0.065 * Math.cos(p.medio * RADIAN)}, ${-ry * 0.09 * Math.sin(p.medio * RADIAN)})`
                      : undefined
                  }
                />
              );
            })}

            {/* Etiquetas con línea guía: nombre, monto y % junto a su porción. */}
            {!compacto && porciones.map((p, indice) => {
              const pos = etiquetas[indice];
              if (!pos) return null;
              const activa = seleccionada === p.codigo;
              const color = colorDe(p.codigo);
              const seno = Math.sin(p.medio * RADIAN);
              const coseno = Math.cos(p.medio * RADIAN);
              const direccion = pos.lado === "der" ? 1 : -1;
              const origen = puntoElipse(cx, cy, rx + 3, ry + 2, p.medio);
              const yOrigen = origen.y + (seno < 0 ? profundidad * 0.6 : 0);
              const xCodo = cx + direccion * Math.max(Math.abs((rx + 22) * coseno), rx * 0.55);
              const xFin = cx + direccion * (rx + 40);
              const xTexto = xFin + direccion * 8;
              const anchoTexto = pos.lado === "der" ? ancho - 6 - xTexto : xTexto - 6;
              return (
                <g
                  key={`etiqueta-${p.codigo}`}
                  className="cursor-pointer"
                  onClick={() => onSeleccionar(p.codigo)}
                >
                  <polyline
                    points={`${origen.x},${yOrigen} ${xCodo},${pos.y} ${xFin},${pos.y}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={activa ? 2 : 1.5}
                  />
                  <circle cx={xFin} cy={pos.y} r={activa ? 4 : 3} fill={color} />
                  <text
                    x={xTexto}
                    y={pos.y - 3}
                    textAnchor={pos.lado === "der" ? "start" : "end"}
                    fontSize={13}
                    fontWeight={activa ? 700 : 500}
                    fill="#1f2937"
                  >
                    {recortarTexto(p.label, anchoTexto)}
                  </text>
                  <text
                    x={xTexto}
                    y={pos.y + 14}
                    textAnchor={pos.lado === "der" ? "start" : "end"}
                    fontSize={13}
                    fontWeight={600}
                    fill={MARCA.emerald}
                    className="tabular-nums"
                  >
                    {formatNumero(p.valor)}
                    <tspan fontSize={12} fontWeight={500} fill="#9ca3af">
                      {`  ${p.porcentaje < 1 ? p.porcentaje.toFixed(1) : Math.round(p.porcentaje)}%`}
                    </tspan>
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {compacto && (
        <ul className="mt-3 space-y-1.5">
          {porciones.map((p) => {
            const activa = seleccionada === p.codigo;
            return (
              <li key={p.codigo}>
                <button
                  type="button"
                  onClick={() => onSeleccionar(p.codigo)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                    activa ? "bg-[#E6F4EF] font-semibold" : "bg-white"
                  }`}
                >
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: colorDe(p.codigo) }} />
                  <span className="min-w-0 flex-1 truncate text-gray-800">{p.label}</span>
                  <span className="shrink-0 tabular-nums text-[#012928]">{formatNumero(p.valor)}</span>
                  <span className="w-10 shrink-0 text-right tabular-nums text-gray-400">
                    {p.porcentaje < 1 ? p.porcentaje.toFixed(1) : Math.round(p.porcentaje)}%
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

function TendenciaChart({
  datos,
  serie,
  moneda,
  cargando,
}: {
  datos: PuntoTendencia[] | null;
  serie: "ingresos" | "gastos";
  moneda: string;
  cargando: boolean;
}) {
  const color = serie === "ingresos" ? MARCA.emerald : "#A57C00";
  const colorPunto = serie === "ingresos" ? MARCA.volt : MARCA.solar;

  if (cargando && !datos) {
    return (
      <div className="flex h-56 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#012928]/50" />
      </div>
    );
  }
  if (!datos || datos.length === 0) {
    return <p className="py-16 text-center text-base text-gray-400">Sin datos de meses anteriores.</p>;
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#f1f5f4" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={46}
            tickFormatter={formatNumeroCorto}
          />
          <Tooltip
            formatter={(value: number) => formatMonto(moneda, value)}
            contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Line
            type="monotone"
            dataKey={serie}
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: colorPunto, stroke: color, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: colorPunto, stroke: color, strokeWidth: 2 }}
            isAnimationActive
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Detalle por movimiento ──────────────────────────────────────────── */

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
      <td className="py-2.5 pr-3 align-top text-base text-gray-700">
        <div>{m.detalle}</div>
        {movido && (
          <div className="mt-1 flex flex-wrap items-center gap-1 text-sm text-amber-700">
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
          className="rounded border bg-white px-2 py-1.5 text-sm disabled:opacity-50"
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
          <span className={`whitespace-nowrap text-sm font-medium ${m.excluido ? "text-gray-400" : "text-[#012928]"}`}>
            {m.excluido ? "Excluido de los totales" : "Incluido en los totales"}
          </span>
        </div>
      </td>
      <td
        className={`py-2.5 text-right align-top text-base tabular-nums whitespace-nowrap ${
          m.excluido ? "text-gray-400 line-through" : "text-gray-800"
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
        <tr className="bg-gray-50 text-sm text-gray-500">
          <th className="px-3 py-2 text-left font-semibold">Detalle</th>
          <th className="px-3 py-2 text-left font-semibold">Categoría</th>
          <th className="px-3 py-2 text-left font-semibold">¿Cuenta en el total?</th>
          <th className="px-3 py-2 text-right font-semibold">Monto</th>
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
    return <p className="px-3 py-3 text-sm text-gray-400">Sin datos.</p>;
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
              className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left hover:bg-gray-50 disabled:hover:bg-white"
            >
              <span className="flex items-center gap-2 text-base text-gray-800">
                {detalle.length > 0 ? (
                  isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
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
    <div key={categoria} className="animate-fade-in rounded-2xl border bg-white p-5 shadow-[0_12px_28px_-24px_rgba(1,41,40,0.45)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[#012928]">Detalle · {label}</h3>
        {!soloUnaPersona && !soloUnTipo && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAgrupacion("tipo")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                agrupacion === "tipo" ? "bg-[#012928] text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Por tipo
            </button>
            <button
              type="button"
              onClick={() => setAgrupacion("persona")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                agrupacion === "persona" ? "bg-[#012928] text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Por persona
            </button>
          </div>
        )}
      </div>

      {ingresos.movimientos.length === 0 ? (
        <p className="rounded-xl border py-10 text-center text-base text-gray-400">
          Sin ingresos en esta categoría para el periodo.
        </p>
      ) : soloUnaPersona ? (
        <div className="overflow-hidden rounded-xl border">
          <TablaMovimientos
            movimientos={ingresos.movimientos}
            categoriaActual={categoria}
            categoriasDisponibles={categoriasDisponibles}
            onCambio={onCambio}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
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

/* ── Gastos ──────────────────────────────────────────────────────────── */

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
    return <p className="px-1 text-sm text-gray-400">Sin gastos en este periodo.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-[0_12px_28px_-24px_rgba(1,41,40,0.45)]">
      <div className="flex items-center gap-1 border-b bg-white px-3 py-2">
        <button
          type="button"
          onClick={() => setAgrupacion("fecha")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            agrupacion === "fecha" ? "bg-[#012928] text-white" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Por fecha
        </button>
        <button
          type="button"
          onClick={() => setAgrupacion("persona")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            agrupacion === "persona" ? "bg-[#012928] text-white" : "text-gray-600 hover:bg-gray-100"
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
                <th className="px-3 py-2 text-left font-medium text-gray-600">Fecha</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Persona</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Detalle</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Monto</th>
              </tr>
            </thead>
            <tbody>
              {gastos.movimientos.map((m: ContabilidadGastoMovimiento, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="whitespace-nowrap px-3 py-1.5 text-gray-600">
                    {m.fecha ? new Date(m.fecha).toLocaleString("es-CU", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-gray-800">{soloNombre(m.persona)}</td>
                  <td className="px-3 py-1.5 text-gray-600">{m.detalle}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-gray-800">
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
                  className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2 text-base text-gray-800">
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
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
                            <td className="whitespace-nowrap py-1.5 pr-3 text-gray-500">
                              {m.fecha ? new Date(m.fecha).toLocaleDateString("es-CU") : "—"}
                            </td>
                            <td className="py-1.5 pr-3 text-gray-600">{m.detalle}</td>
                            <td className="whitespace-nowrap py-1.5 text-right tabular-nums text-gray-700">
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

/* ── Sección completa ────────────────────────────────────────────────── */

export function ContabilidadSection({ accionExtra }: { accionExtra?: React.ReactNode }) {
  const [modo, setModo] = useState<ModoFiltro>("mes");
  const [mes, setMes] = useState(mesActualYYYYMM());
  const [rango, setRango] = useState(() => primerYUltimoDiaDeMes(mesActualYYYYMM())!);
  const [monedaFiltro, setMonedaFiltro] = useState<MonedaFiltro>("todas");
  const [resumen, setResumen] = useState<ContabilidadResumen | null>(null);
  const [loading, setLoading] = useState(false);
  const [vista, setVista] = useState<Vista>("ingresos");
  const [monedaGraficos, setMonedaGraficos] = useState("USD");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [tendencia, setTendencia] = useState<PuntoTendencia[] | null>(null);
  const [loadingTendencia, setLoadingTendencia] = useState(false);
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
      if (!esResumenValido(data)) {
        const mensaje = (data as { error?: { message?: string }; message?: string })?.error?.message;
        throw new Error(mensaje || "El servidor devolvió una respuesta inesperada.");
      }
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

  // La moneda de los gráficos se ajusta sola si la elegida ya no aparece, y
  // el "total" solo vale en ingresos (los gastos no se convierten).
  useEffect(() => {
    if (monedaGraficos === MONEDA_TOTAL) {
      if (vista !== "ingresos") setMonedaGraficos(monedasDisponibles[0] ?? "USD");
      return;
    }
    if (monedasDisponibles.length > 0 && !monedasDisponibles.includes(monedaGraficos)) {
      setMonedaGraficos(monedasDisponibles[0]);
    }
  }, [monedasDisponibles, monedaGraficos, vista]);

  // Tendencia de los últimos meses — solo cuando hace falta (ingresos o gastos).
  useEffect(() => {
    if (vista !== "ingresos" && vista !== "gastos") return;
    let cancelado = false;
    setLoadingTendencia(true);
    obtenerTendenciaMensual(monedaGraficos)
      .then((data) => {
        if (!cancelado) setTendencia(data);
      })
      .catch((error: unknown) => {
        if (!cancelado) {
          toast({
            title: "Error al cargar la tendencia",
            description: getErrorMessage(error, "No se pudo calcular la tendencia de los meses anteriores."),
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (!cancelado) setLoadingTendencia(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monedaGraficos, vista]);

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

  const valorGrafico = useCallback(
    (ingresos: ContabilidadIngresos) =>
      monedaGraficos === MONEDA_TOTAL ? ingresos.total_usd ?? 0 : ingresos.por_moneda[monedaGraficos] ?? 0,
    [monedaGraficos],
  );

  const datosPie = useMemo(() => {
    if (!resumen) return [];
    return resumen.por_categoria
      .map((c) => ({ codigo: c.categoria, label: c.label, valor: valorGrafico(c.ingresos) }))
      .filter((d) => d.valor > 0)
      .sort((a, b) => b.valor - a.valor);
  }, [resumen, valorGrafico]);

  // Elige una categoría por defecto (la más grande) solo la primera vez;
  // después la elección del usuario se conserva.
  useEffect(() => {
    if (!resumen || categoriaSeleccionada !== null) return;
    const mejor = [...resumen.por_categoria].sort((a, b) => valorGrafico(b.ingresos) - valorGrafico(a.ingresos))[0];
    setCategoriaSeleccionada(mejor?.categoria ?? null);
  }, [resumen, valorGrafico, categoriaSeleccionada]);

  const categoriaSeleccionadaResumen =
    resumenMostrado?.por_categoria.find((c) => c.categoria === categoriaSeleccionada) ?? null;

  /** Cómo se nombra la moneda elegida en títulos y ejes. */
  const etiquetaMonedaGraficos = monedaGraficos === MONEDA_TOTAL ? "USD (todas las monedas)" : monedaGraficos;

  // El "total" solo existe para ingresos: los gastos no se convierten.
  const opcionesMonedaGraficos =
    vista === "ingresos" ? [MONEDA_TOTAL, ...monedasDisponibles] : monedasDisponibles;

  const selectorMonedaGraficos =
    opcionesMonedaGraficos.length > 1 ? (
      <div className="flex shrink-0 overflow-hidden rounded-lg border text-sm">
        {opcionesMonedaGraficos.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMonedaGraficos(m)}
            title={m === MONEDA_TOTAL ? "Todas las monedas juntas, en USD" : undefined}
            className={`px-2.5 py-1 font-medium transition-colors ${
              monedaGraficos === m ? "bg-[#012928] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {m === MONEDA_TOTAL ? "Total" : m}
          </button>
        ))}
      </div>
    ) : null;

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
    <Card className="border-none bg-transparent shadow-none">
      <CardContent className="space-y-5 p-0">
        {/* Barra de filtros compacta: una sola fila, sin etiquetas sueltas */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-white px-3 py-2.5 shadow-[0_10px_24px_-22px_rgba(1,41,40,0.4)]">
          <div className="flex overflow-hidden rounded-lg border text-sm">
            <button
              type="button"
              onClick={() => setModo("mes")}
              className={`px-3 py-1.5 font-medium transition-colors ${
                modo === "mes" ? "bg-[#012928] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Mes
            </button>
            <button
              type="button"
              onClick={() => setModo("rango")}
              className={`px-3 py-1.5 font-medium transition-colors ${
                modo === "rango" ? "bg-[#012928] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Rango
            </button>
          </div>

          {modo === "mes" ? (
            <MonthPicker id="contabilidad-mes" value={mes} onChange={setMes} className="h-9" />
          ) : (
            <>
              <Input
                aria-label="Desde"
                type="date"
                value={rango.desde}
                max={rango.hasta}
                onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))}
                className="h-9 w-[148px]"
              />
              <Input
                aria-label="Hasta"
                type="date"
                value={rango.hasta}
                min={rango.desde}
                onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))}
                className="h-9 w-[148px]"
              />
            </>
          )}

          <Select value={monedaFiltro} onValueChange={setMonedaFiltro}>
            <SelectTrigger aria-label="Moneda" className="h-9 w-[116px]">
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

          <Button variant="outline" size="icon" className="h-9 w-9" onClick={cargar} disabled={loading} title="Actualizar">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={exportarPdf} disabled={!resumenMostrado}>
            <FileDown className="mr-1.5 h-4 w-4" />
            PDF
          </Button>

          {accionExtra && <div className="ml-auto">{accionExtra}</div>}
        </div>

        {resumenMostrado ? (
          <div className="space-y-5">
            <TarjetasResumen
              monedas={columnasMoneda}
              valores={{
                ingresos: resumenMostrado.general.ingresos.por_moneda,
                gastos: resumenMostrado.general.gastos.por_moneda,
                saldo: resumenMostrado.general.saldo.por_moneda,
              }}
              totalIngresosUsd={monedaFiltro === "todas" ? resumen?.general.ingresos.total_usd ?? null : null}
              sinConvertir={resumen?.general.ingresos.sin_convertir ?? {}}
              vista={vista}
              onSeleccionar={seleccionarVista}
            />

            {vista === "ingresos" && (
              <>
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                  <div className="xl:col-span-7">
                    <PanelGrafico titulo="Distribución de ingresos" icono={PieChartIcon} acciones={selectorMonedaGraficos}>
                      <DistribucionIngresosPie
                        datos={datosPie}
                        seleccionada={categoriaSeleccionada}
                        onSeleccionar={setCategoriaSeleccionada}
                        moneda={etiquetaMonedaGraficos}
                        colorDe={colorDeCategoria}
                      />
                    </PanelGrafico>
                  </div>

                  <div className="xl:col-span-5">
                    <PanelGrafico titulo={`Ingresos por mes · ${etiquetaMonedaGraficos}`} icono={Activity}>
                      <TendenciaChart datos={tendencia} serie="ingresos" moneda={etiquetaMonedaGraficos} cargando={loadingTendencia} />
                    </PanelGrafico>
                  </div>
                </div>

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
              </>
            )}

            {vista === "gastos" && (
              <>
                <PanelGrafico titulo={`Gastos por mes · ${etiquetaMonedaGraficos}`} icono={Activity} acciones={selectorMonedaGraficos}>
                  <TendenciaChart datos={tendencia} serie="gastos" moneda={etiquetaMonedaGraficos} cargando={loadingTendencia} />
                </PanelGrafico>
                <GastosSection gastos={resumenMostrado.general.gastos} />
              </>
            )}

            {vista === "saldo" && (
              <div className="rounded-2xl border bg-white p-5 shadow-[0_12px_28px_-24px_rgba(1,41,40,0.45)]">
                <div className="mb-3 flex items-center gap-2">
                  <WalletIcon className="h-4 w-4 text-[#012928]" />
                  <h3 className="text-base font-semibold text-[#012928]">Billeteras con saldo</h3>
                </div>
                {loadingBilleteras ? (
                  <div className="py-8 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#012928]/50" />
                  </div>
                ) : billeteras && billeteras.billeteras.length > 0 ? (
                  <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border">
                    {billeteras.billeteras.map((b) => (
                      <div key={b.persona} className="flex items-center justify-between gap-4 px-3 py-2.5">
                        <span className="text-base text-gray-800">{soloNombre(b.persona)}</span>
                        <MontosPorMonedaLine montos={b.por_moneda} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-sm text-gray-500">Ninguna billetera tiene saldo actualmente.</p>
                )}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#012928]/50" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
