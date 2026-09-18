"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Loader2,
  Minus,
  RefreshCw,
  ShoppingBag,
  SunMedium,
  Users,
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
import { MonthPicker } from "@/components/shared/molecule/month-picker";
import { InformeDireccionService } from "@/lib/services/feats/informe-direccion/informe-direccion-service";
import type { MesDesempeno } from "@/lib/types/feats/informe-direccion/informe-direccion-types";

/* ── Métricas ─────────────────────────────────────────────────────────── */

type Linea = "instaladora" | "ventas";
type Formato = "entero" | "usd" | "pct" | "dias" | "decimal";

type Metrica = {
  key: string;
  label: string;
  formato: Formato;
  /** Qué dirección es buena noticia; decide el color del cambio. */
  mejor: "sube" | "baja" | "neutro";
  /** "de los cuales…": se muestra dentro de la métrica anterior. */
  sub?: boolean;
  /** No se puede atribuir a un comercial (no sale en su tabla). */
  soloGeneral?: boolean;
};

// Mismas métricas y mismo orden que el PDF comparativo de la pestaña Otros.
const METRICAS: Record<Linea, Metrica[]> = {
  instaladora: [
    {
      key: "leads_nuevos",
      label: "Leads nuevos",
      formato: "entero",
      mejor: "sube",
    },
    {
      key: "clientes_nuevos_total",
      label: "Clientes nuevos (total)",
      formato: "entero",
      mejor: "sube",
    },
    {
      key: "clientes_nuevos_trabajadores",
      label: "de los cuales, trabajadores SunCar",
      formato: "entero",
      mejor: "neutro",
      sub: true,
    },
    {
      key: "clientes_nuevos_reales",
      label: "de los cuales, clientes reales",
      formato: "entero",
      mejor: "sube",
      sub: true,
    },
    {
      key: "conversion_pct",
      label: "Conversión lead → cliente (reales)",
      formato: "pct",
      mejor: "sube",
    },
    {
      key: "instalaciones_completadas",
      label: "Instalaciones completadas",
      formato: "entero",
      mejor: "sube",
    },
    {
      key: "dias_promedio_confirmacion_instalacion",
      label: "Días promedio confirmación → instalación",
      formato: "dias",
      mejor: "baja",
    },
    {
      key: "ofertas_confirmadas_con_anticipo",
      label: "Ofertas confirmadas con anticipo pagado",
      formato: "entero",
      mejor: "sube",
    },
    {
      key: "averias_reportadas",
      label: "Averías reportadas (total)",
      formato: "entero",
      mejor: "baja",
    },
    {
      key: "averias_resueltas",
      label: "resueltas",
      formato: "entero",
      mejor: "sube",
      sub: true,
    },
    {
      key: "averias_pendientes",
      label: "pendientes",
      formato: "entero",
      mejor: "baja",
      sub: true,
    },
    {
      key: "ofertas_creadas",
      label: "Ofertas creadas",
      formato: "entero",
      mejor: "sube",
    },
    {
      key: "ofertas_confirmadas",
      label: "Ofertas confirmadas",
      formato: "entero",
      mejor: "sube",
    },
    {
      key: "monto_vendido",
      label: "Monto vendido (confirmadas)",
      formato: "usd",
      mejor: "sube",
    },
    {
      key: "monto_cobrado_total_mes",
      label: "Monto cobrado — total del periodo",
      formato: "usd",
      mejor: "sube",
    },
    {
      key: "monto_cobrado_de_confirmadas",
      label: "Monto cobrado — de lo confirmado en el periodo",
      formato: "usd",
      mejor: "sube",
    },
    {
      key: "vales_salida_promedio_dia",
      label: "Vales de salida — promedio por día",
      formato: "decimal",
      mejor: "neutro",
      soloGeneral: true,
    },
  ],
  ventas: [
    {
      key: "solicitudes_creadas",
      label: "Solicitudes creadas",
      formato: "entero",
      mejor: "sube",
    },
    {
      key: "solicitudes_de_clientes_nuevos",
      label: "de clientes nuevos (primera compra)",
      formato: "entero",
      mejor: "sube",
      sub: true,
    },
    {
      key: "solicitudes_de_clientes_recurrentes",
      label: "de clientes recurrentes",
      formato: "entero",
      mejor: "sube",
      sub: true,
    },
    {
      key: "monto_vendido",
      label: "Monto vendido",
      formato: "usd",
      mejor: "sube",
    },
    {
      key: "descuento_otorgado",
      label: "Descuento otorgado",
      formato: "usd",
      mejor: "baja",
    },
    {
      key: "solicitudes_pagadas",
      label: "Solicitudes pagadas",
      formato: "entero",
      mejor: "sube",
    },
    {
      key: "solicitudes_no_pagadas",
      label: "Solicitudes no pagadas",
      formato: "entero",
      mejor: "baja",
    },
  ],
};

/** Columnas de la tabla por comercial (cabeceras cortas). Los montos van
 * primero: son lo que más se mira y la tabla es ancha. */
const COLUMNAS_COMERCIAL: Record<
  Linea,
  { key: string; titulo: string; detalle?: string }[]
> = {
  instaladora: [
    { key: "monto_vendido", titulo: "Vendido" },
    { key: "monto_cobrado_total_mes", titulo: "Cobrado en el mes" },
    { key: "monto_cobrado_de_confirmadas", titulo: "Cobrado de lo confirmado" },
    { key: "leads_nuevos", titulo: "Leads" },
    {
      key: "clientes_nuevos_reales",
      titulo: "Clientes reales",
      detalle: "Clientes nuevos reales",
    },
    { key: "conversion_pct", titulo: "Conversión" },
    { key: "ofertas_creadas", titulo: "Ofertas creadas" },
    { key: "ofertas_confirmadas", titulo: "Confirmadas" },
    { key: "ofertas_confirmadas_con_anticipo", titulo: "Con anticipo" },
    { key: "instalaciones_completadas", titulo: "Instalaciones" },
    {
      key: "dias_promedio_confirmacion_instalacion",
      titulo: "Días conf. → inst.",
    },
    { key: "averias_reportadas", titulo: "Averías" },
    {
      key: "averias_pendientes",
      titulo: "Pendientes",
      detalle: "Averías pendientes",
    },
  ],
  ventas: [
    { key: "monto_vendido", titulo: "Vendido" },
    { key: "descuento_otorgado", titulo: "Descuento" },
    { key: "solicitudes_creadas", titulo: "Solicitudes" },
    {
      key: "solicitudes_de_clientes_nuevos",
      titulo: "De nuevos",
      detalle: "Solicitudes de clientes nuevos",
    },
    {
      key: "solicitudes_de_clientes_recurrentes",
      titulo: "De recurrentes",
      detalle: "Solicitudes de clientes recurrentes",
    },
    { key: "clientes_nuevos", titulo: "Clientes nuevos" },
    { key: "solicitudes_pagadas", titulo: "Pagadas" },
    { key: "solicitudes_no_pagadas", titulo: "No pagadas" },
  ],
};

/** Cargo exacto con el que el backend arma la plantilla de cada línea. */
const CARGO_PLANTILLA: Record<Linea, string> = {
  instaladora: "Comercial Instaladora",
  ventas: "Comercial Ventas",
};

const METRICA_CLIENTES_NUEVOS_VENTAS: Metrica = {
  key: "clientes_nuevos",
  label: "Clientes nuevos",
  formato: "entero",
  mejor: "sube",
};

function metricaPorKey(linea: Linea, key: string): Metrica {
  if (key === METRICA_CLIENTES_NUEVOS_VENTAS.key)
    return METRICA_CLIENTES_NUEVOS_VENTAS;
  return METRICAS[linea].find((m) => m.key === key) ?? METRICAS[linea][0];
}

const LINEAS: Record<
  Linea,
  {
    titulo: string;
    icono: typeof SunMedium;
    superficie: string;
    anillo: string;
    chip: string;
    valor: string;
    etiqueta: string;
    destacadas: string[];
  }
> = {
  instaladora: {
    titulo: "Comercial Instaladora",
    icono: SunMedium,
    superficie: "bg-[#E6F4EF]",
    anillo: "ring-[#AFEB17]",
    chip: "bg-[#AFEB17] text-[#012928]",
    valor: "text-[#012928]",
    etiqueta: "text-[#012928]/70",
    destacadas: [
      "ofertas_confirmadas",
      "clientes_nuevos_total",
      "instalaciones_completadas",
    ],
  },
  ventas: {
    titulo: "Ventas",
    icono: ShoppingBag,
    superficie: "bg-[#FDF5DC]",
    anillo: "ring-[#F2C300]",
    chip: "bg-[#F2C300] text-[#012928]",
    valor: "text-[#5C4300]",
    etiqueta: "text-[#5C4300]/75",
    destacadas: [
      "solicitudes_creadas",
      "solicitudes_pagadas",
      "descuento_otorgado",
    ],
  },
};

/* ── Formato ──────────────────────────────────────────────────────────── */

const NF0 = new Intl.NumberFormat("es-CU", { maximumFractionDigits: 0 });
const NF1 = new Intl.NumberFormat("es-CU", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const NF2 = new Intl.NumberFormat("es-CU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Montos siempre "USD 1,234.56": código y monto, nunca símbolo. */
function formatear(valor: number | null, formato: Formato): string {
  if (valor === null) return "—";
  switch (formato) {
    case "usd":
      return `USD ${NF2.format(valor)}`;
    case "pct":
      return `${NF1.format(valor)}%`;
    case "dias":
      return `${NF1.format(valor)} días`;
    case "decimal":
      return NF1.format(valor);
    default:
      return NF0.format(valor);
  }
}

function formatearEje(valor: number) {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(valor / 1_000)}k`;
  return String(Math.round(valor * 10) / 10);
}

function numero(
  registro: object | null | undefined,
  key: string,
): number | null {
  const v = (registro as Record<string, unknown> | null | undefined)?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

type Variacion = {
  texto: string;
  tono: "bueno" | "malo" | "neutro";
  direccion: "sube" | "baja" | "igual";
};

/** Cambio frente al mes anterior. Porcentaje para cantidades y montos;
 * puntos para la conversión y días para el promedio de días. */
function variacion(
  actual: number | null,
  anterior: number | null,
  metrica: Metrica,
): Variacion | null {
  if (actual === null || anterior === null) return null;
  const diferencia = actual - anterior;
  if (Math.abs(diferencia) < 1e-9)
    return { texto: "igual", tono: "neutro", direccion: "igual" };
  const direccion = diferencia > 0 ? "sube" : "baja";
  const signo = diferencia > 0 ? "+" : "−";
  let texto: string;
  if (metrica.formato === "pct")
    texto = `${signo}${NF1.format(Math.abs(diferencia))} pts`;
  else if (metrica.formato === "dias")
    texto = `${signo}${NF1.format(Math.abs(diferencia))} días`;
  else if (anterior === 0) texto = "antes 0";
  else
    texto = `${signo}${NF0.format(Math.abs((diferencia / anterior) * 100))}%`;
  const tono =
    metrica.mejor === "neutro"
      ? "neutro"
      : metrica.mejor === direccion
        ? "bueno"
        : "malo";
  return { texto, tono, direccion };
}

/* ── Meses ────────────────────────────────────────────────────────────── */

function mesActualYYYYMM(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function ultimoDiaDelMes(mes: string): string {
  const [anio, m] = mes.split("-").map(Number);
  return `${mes}-${String(new Date(anio, m, 0).getDate()).padStart(2, "0")}`;
}

function nombreMes(mes: string, largo = false): string {
  const [anio, m] = mes.split("-").map(Number);
  const fecha = new Date(anio, m - 1, 1);
  if (largo) {
    const texto = fecha.toLocaleDateString("es-CU", {
      month: "long",
      year: "numeric",
    });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  const corto = fecha
    .toLocaleDateString("es-CU", { month: "short" })
    .replace(".", "");
  return `${corto} ${String(anio).slice(2)}`;
}

/* ── Piezas de UI ─────────────────────────────────────────────────────── */

function ChipVariacion({
  v,
  contra,
}: {
  v: Variacion | null;
  contra?: string;
}) {
  if (!v) return null;
  const Icono =
    v.direccion === "sube"
      ? ArrowUpRight
      : v.direccion === "baja"
        ? ArrowDownRight
        : Minus;
  const color =
    v.tono === "bueno"
      ? "bg-[#E6F4EF] text-[#0B6B3A]"
      : v.tono === "malo"
        ? "bg-[#FDECEC] text-[#9B1C1C]"
        : "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-xs font-semibold ${color}`}
    >
      <Icono className="h-3 w-3" />
      {v.texto}
      {contra && (
        <span className="font-medium opacity-70">&nbsp;vs {contra}</span>
      )}
    </span>
  );
}

function Panel({
  titulo,
  icono: Icono,
  acciones,
  children,
}: {
  titulo: React.ReactNode;
  icono: typeof Activity;
  acciones?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-[0_12px_28px_-24px_rgba(1,41,40,0.45)]">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icono className="h-4 w-4 text-[#012928]" />
          <h3 className="text-base font-semibold text-[#012928]">{titulo}</h3>
        </div>
        {acciones}
      </header>
      {children}
    </section>
  );
}

/** Tarjeta de cada métrica del mes; sus "de los cuales" van dentro. */
function TarjetaMetrica({
  metrica,
  subs,
  actual,
  anterior,
  mesAnterior,
  activa,
  onSeleccionar,
}: {
  metrica: Metrica;
  subs: Metrica[];
  actual: object | undefined;
  anterior: object | undefined;
  mesAnterior?: string;
  activa: boolean;
  onSeleccionar: () => void;
}) {
  const valor = numero(actual, metrica.key);
  return (
    <button
      type="button"
      onClick={onSeleccionar}
      className={`flex flex-col rounded-xl border bg-white p-4 text-left transition-shadow ${
        activa
          ? "border-[#012928] ring-1 ring-[#012928]"
          : "hover:shadow-[0_10px_24px_-18px_rgba(1,41,40,0.5)]"
      }`}
    >
      <span className="text-sm font-medium text-gray-600">{metrica.label}</span>
      <span className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-[#012928]">
        {formatear(valor, metrica.formato)}
      </span>
      <span className="mt-1.5">
        <ChipVariacion
          v={variacion(valor, numero(anterior, metrica.key), metrica)}
          contra={mesAnterior}
        />
      </span>
      {subs.length > 0 && (
        <span className="mt-3 space-y-1 border-t border-gray-100 pt-2.5">
          {subs.map((s) => (
            <span
              key={s.key}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="text-gray-500">{s.label}</span>
              <span className="font-semibold tabular-nums text-gray-800">
                {formatear(numero(actual, s.key), s.formato)}
              </span>
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

function GraficoEvolucion({
  meses,
  valores,
  metrica,
}: {
  meses: string[];
  valores: (number | null)[];
  metrica: Metrica;
}) {
  const datos = meses.map((m, i) => ({ mes: nombreMes(m), valor: valores[i] }));
  const ultimo = datos.length - 1;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={datos}
          margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
        >
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
            width={52}
            tickFormatter={formatearEje}
          />
          <Tooltip
            formatter={(v: number) => [
              formatear(v, metrica.formato),
              metrica.label,
            ]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              fontSize: 13,
            }}
          />
          <Line
            type="monotone"
            dataKey="valor"
            stroke="#012928"
            strokeWidth={2.5}
            connectNulls
            isAnimationActive={false}
            dot={(props: { cx?: number; cy?: number; index?: number }) => {
              const { cx, cy, index } = props;
              if (cx === undefined || cy === undefined)
                return <g key={index} />;
              const esUltimo = index === ultimo;
              return (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={esUltimo ? 6 : 4}
                  fill={esUltimo ? "#AFEB17" : "#ffffff"}
                  stroke="#012928"
                  strokeWidth={2}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Tabla métricas × meses; el último mes (el elegido) va resaltado. */
function MatrizMeses({
  meses,
  metricas,
  valor,
  seleccionada,
  onSeleccionar,
}: {
  meses: string[];
  metricas: Metrica[];
  valor: (indiceMes: number, key: string) => number | null;
  seleccionada?: string;
  onSeleccionar?: (key: string) => void;
}) {
  const ultimo = meses.length - 1;
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-gray-600">
            <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2.5 font-semibold">
              Métrica
            </th>
            {meses.map((m, i) => (
              <th
                key={m}
                className={`px-3 py-2.5 text-right font-semibold ${i === ultimo ? "bg-[#E6F4EF] text-[#012928]" : ""}`}
              >
                {nombreMes(m)}
              </th>
            ))}
            <th className="px-3 py-2.5 text-right font-semibold">
              vs mes anterior
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {metricas.map((metrica) => {
            const activa = seleccionada === metrica.key;
            const clicable = Boolean(onSeleccionar);
            return (
              <tr
                key={metrica.key}
                onClick={
                  clicable ? () => onSeleccionar?.(metrica.key) : undefined
                }
                className={`${clicable ? "cursor-pointer hover:bg-gray-50" : ""} ${activa ? "bg-[#F4FAF7]" : ""}`}
              >
                <td
                  className={`sticky left-0 z-10 px-3 py-2 ${activa ? "bg-[#F4FAF7]" : "bg-white"} ${
                    metrica.sub
                      ? "pl-8 text-gray-500"
                      : "font-medium text-gray-800"
                  }`}
                >
                  <span className="block w-36 sm:w-auto">{metrica.label}</span>
                </td>
                {meses.map((m, i) => (
                  <td
                    key={m}
                    className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${
                      i === ultimo
                        ? "bg-[#E6F4EF]/60 font-semibold text-[#012928]"
                        : "text-gray-700"
                    }`}
                  >
                    {formatear(valor(i, metrica.key), metrica.formato)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right">
                  <ChipVariacion
                    v={variacion(
                      valor(ultimo, metrica.key),
                      ultimo > 0 ? valor(ultimo - 1, metrica.key) : null,
                      metrica,
                    )}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type FilaComercial = { nombre: string; en_plantilla?: boolean } & Record<
  string,
  unknown
>;

function TablaComerciales({
  linea,
  meses,
  datos,
  total,
}: {
  linea: Linea;
  meses: string[];
  datos: MesDesempeno[];
  total: object | undefined;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const columnas = COLUMNAS_COMERCIAL[linea];
  const actual = datos[datos.length - 1];

  const filasDe = useCallback(
    (mes: MesDesempeno | undefined): FilaComercial[] =>
      ((linea === "instaladora"
        ? mes?.comercial_instaladora
        : mes?.comercial_ventas) ?? []) as FilaComercial[],
    [linea],
  );
  const sinAsignarDe = (mes: MesDesempeno | undefined) =>
    (linea === "instaladora"
      ? mes?.comercial_instaladora_sin_asignar
      : mes?.comercial_ventas_sin_asignar) as FilaComercial | undefined;

  const tieneActividad = (f: FilaComercial | undefined) =>
    Boolean(f) && columnas.some((c) => (numero(f, c.key) ?? 0) !== 0);

  // Mayor venta primero; quien no hizo nada en el mes, al final.
  const filas = useMemo(
    () =>
      [...filasDe(actual)].sort(
        (a, b) =>
          Number(tieneActividad(b)) - Number(tieneActividad(a)) ||
          (numero(b, "monto_vendido") ?? 0) -
            (numero(a, "monto_vendido") ?? 0) ||
          a.nombre.localeCompare(b.nombre),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actual, filasDe],
  );
  const sinAsignar = sinAsignarDe(actual);
  // En la evolución cada métrica va sola: sin sangría ni "de los cuales".
  const metricasDetalle = columnas.map((c) => {
    const m = metricaPorKey(linea, c.key);
    return { ...m, sub: false, label: c.detalle ?? m.label };
  });

  if (filas.length === 0 && !tieneActividad(sinAsignar)) {
    return (
      <p className="py-10 text-center text-base text-gray-400">
        No hay comerciales en este mes.
      </p>
    );
  }

  const celdas = (f: object | undefined, enfasis = false) =>
    columnas.map((c) => {
      const metrica = metricaPorKey(linea, c.key);
      return (
        <td
          key={c.key}
          className={`whitespace-nowrap px-3 py-2.5 text-right tabular-nums ${
            enfasis ? "font-semibold text-[#012928]" : "text-gray-700"
          }`}
        >
          {formatear(numero(f, c.key), metrica.formato)}
        </td>
      );
    });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-600">
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2.5 font-semibold">
                Comercial
              </th>
              {columnas.map((c) => (
                <th
                  key={c.key}
                  className="px-3 py-2.5 text-right font-semibold"
                >
                  {c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((f) => {
              const expandida = abierto === f.nombre;
              const activa = tieneActividad(f);
              return (
                <Fragment key={f.nombre}>
                  <tr
                    onClick={() => setAbierto(expandida ? null : f.nombre)}
                    className={`cursor-pointer hover:bg-gray-50 ${expandida ? "bg-[#F4FAF7]" : ""} ${activa ? "" : "text-gray-400"}`}
                  >
                    <td
                      className={`sticky left-0 z-10 px-3 py-2.5 ${expandida ? "bg-[#F4FAF7]" : "bg-white"}`}
                    >
                      <span className="flex w-44 items-center gap-1.5 sm:w-auto">
                        {expandida ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                        )}
                        <span
                          className={`font-medium ${activa ? "text-gray-900" : "text-gray-400"}`}
                        >
                          {f.nombre}
                        </span>
                        {f.en_plantilla === false && (
                          <span
                            className="rounded-full bg-[#FDF5DC] px-1.5 py-0.5 text-[11px] font-semibold text-[#5C4300]"
                            title={`No tiene el cargo "${CARGO_PLANTILLA[linea]}", pero tuvo actividad en este mes`}
                          >
                            otro cargo
                          </span>
                        )}
                      </span>
                    </td>
                    {celdas(f)}
                  </tr>
                </Fragment>
              );
            })}
            {tieneActividad(sinAsignar) && (
              <tr className="text-gray-500">
                <td className="sticky left-0 z-10 bg-white px-3 py-2.5 italic">
                  <span className="pl-5">Sin comercial asignado</span>
                </td>
                {celdas(sinAsignar)}
              </tr>
            )}
            {total && (
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2.5 font-semibold text-[#012928]">
                  <span className="pl-5">Total</span>
                </td>
                {celdas(
                  // "Clientes nuevos" de Ventas no está en el resumen general: se suma.
                  linea === "ventas"
                    ? {
                        ...total,
                        clientes_nuevos:
                          filas.reduce(
                            (s, f) => s + (numero(f, "clientes_nuevos") ?? 0),
                            0,
                          ) + (numero(sinAsignar, "clientes_nuevos") ?? 0),
                      }
                    : total,
                  true,
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Evolución del comercial elegido: fuera de la tabla ancha para que
          se vean todos los meses sin desplazarse de lado. */}
      {abierto && (
        <div className="rounded-xl border border-[#012928]/15 bg-[#F4FAF7] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-[#012928]">
              Evolución de {abierto}
            </p>
            <button
              type="button"
              onClick={() => setAbierto(null)}
              className="rounded-lg px-2 py-1 text-sm font-medium text-gray-600 hover:bg-white"
            >
              Cerrar
            </button>
          </div>
          <MatrizMeses
            meses={meses}
            metricas={metricasDetalle}
            valor={(i, key) => {
              // Un mes sin fila = no tuvo actividad: 0, salvo el promedio de días, que no existe.
              const fila = filasDe(datos[i]).find((x) => x.nombre === abierto);
              if (fila) return numero(fila, key);
              return key === "dias_promedio_confirmacion_instalacion"
                ? null
                : 0;
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Sección ──────────────────────────────────────────────────────────── */

export type PermisosDesempeno = {
  instaladoraGeneral: boolean;
  comercialInstaladora: boolean;
  ventas: boolean;
  comercialVentas: boolean;
};

export function DesempenoSection({
  permisos,
}: {
  permisos: PermisosDesempeno;
}) {
  const lineasVisibles = useMemo(() => {
    const lineas: Linea[] = [];
    if (permisos.instaladoraGeneral || permisos.comercialInstaladora)
      lineas.push("instaladora");
    if (permisos.ventas || permisos.comercialVentas) lineas.push("ventas");
    return lineas;
  }, [permisos]);

  const [mes, setMes] = useState(mesActualYYYYMM());
  const [cantidadMeses, setCantidadMeses] = useState(6);
  const [linea, setLinea] = useState<Linea>(lineasVisibles[0] ?? "instaladora");
  const [datos, setDatos] = useState<MesDesempeno[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metricaGrafico, setMetricaGrafico] = useState("monto_vendido");
  const peticion = useRef(0);

  const cargar = useCallback(async () => {
    if (!mes) return;
    const id = ++peticion.current;
    setCargando(true);
    setError(null);
    try {
      const respuesta = await InformeDireccionService.obtenerDesempeno(
        ultimoDiaDelMes(mes),
        cantidadMeses,
      );
      // Solo cuenta la última petición: cambiar de mes rápido no mezcla datos.
      if (id === peticion.current) setDatos(respuesta.meses);
    } catch (e) {
      if (id === peticion.current)
        setError(
          e instanceof Error ? e.message : "No se pudo cargar el desempeño.",
        );
    } finally {
      if (id === peticion.current) setCargando(false);
    }
  }, [mes, cantidadMeses]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // "Monto vendido" existe en las dos líneas; cualquier otra se reinicia.
  useEffect(() => {
    if (!METRICAS[linea].some((m) => m.key === metricaGrafico))
      setMetricaGrafico("monto_vendido");
  }, [linea, metricaGrafico]);

  const meses = useMemo(() => datos?.map((d) => d.mes) ?? [], [datos]);
  const actual = datos?.[datos.length - 1];
  const anterior =
    datos && datos.length > 1 ? datos[datos.length - 2] : undefined;
  const mesAnteriorCorto = anterior
    ? nombreMes(anterior.mes).split(" ")[0]
    : undefined;
  const enCurso = actual?.mes === mesActualYYYYMM();

  const generalDe = useCallback(
    (m: MesDesempeno | undefined, l: Linea) =>
      l === "instaladora" ? m?.instaladora_general : m?.ventas,
    [],
  );
  const puedeGeneral =
    linea === "instaladora" ? permisos.instaladoraGeneral : permisos.ventas;
  const puedeComercial =
    linea === "instaladora"
      ? permisos.comercialInstaladora
      : permisos.comercialVentas;

  const metricas = METRICAS[linea];
  const principales = metricas.filter((m) => !m.sub);
  const subsDe = (key: string) => {
    const i = metricas.findIndex((m) => m.key === key);
    const subs: Metrica[] = [];
    for (let j = i + 1; j < metricas.length && metricas[j].sub; j++)
      subs.push(metricas[j]);
    return subs;
  };
  const metricaActiva = metricaPorKey(linea, metricaGrafico);
  const valorGeneral = (i: number, key: string) =>
    numero(generalDe(datos?.[i], linea), key);

  if (lineasVisibles.length === 0) return null;

  return (
    <div className="space-y-5">
      {/* Filtros: el mes que se analiza y cuántos meses se comparan */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-white px-3 py-2.5 shadow-[0_10px_24px_-22px_rgba(1,41,40,0.4)]">
        <MonthPicker
          id="desempeno-mes"
          value={mes}
          onChange={setMes}
          className="h-9"
        />
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Comparar</span>
          <div className="flex overflow-hidden rounded-lg border">
            {[3, 6, 12].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCantidadMeses(n)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  cantidadMeses === n
                    ? "bg-[#012928] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {n} meses
              </button>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={cargar}
          disabled={cargando}
          title="Actualizar"
        >
          {cargando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
        {enCurso && (
          <span className="ml-auto rounded-full bg-[#FDF5DC] px-2.5 py-1 text-xs font-semibold text-[#5C4300]">
            {nombreMes(actual!.mes, true)} va en curso: se compara con meses
            completos
          </span>
        )}
      </div>

      {error && !datos && (
        <div className="rounded-2xl border bg-white p-8 text-center">
          <p className="text-base text-gray-700">{error}</p>
          <Button variant="outline" className="mt-3" onClick={cargar}>
            Reintentar
          </Button>
        </div>
      )}

      {!datos && !error && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border bg-white py-20 text-gray-500">
          <Loader2 className="h-7 w-7 animate-spin text-[#012928]/60" />
          <p className="text-base">
            Calculando el desempeño de {cantidadMeses} meses…
          </p>
        </div>
      )}

      {datos && actual && (
        <div
          className={`space-y-5 transition-opacity ${cargando ? "opacity-60" : ""}`}
        >
          {/* Líneas de negocio: tocar una muestra su detalle debajo */}
          <div
            className={`grid grid-cols-1 gap-4 ${lineasVisibles.length > 1 ? "md:grid-cols-2" : ""}`}
          >
            {lineasVisibles.map((l) => {
              const estilo = LINEAS[l];
              const Icono = estilo.icono;
              const g = generalDe(actual, l);
              const gAnt = generalDe(anterior, l);
              const vendido = metricaPorKey(l, "monto_vendido");
              const activo = linea === l;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLinea(l)}
                  className={`flex flex-col rounded-2xl ${estilo.superficie} p-5 text-left shadow-[0_12px_28px_-20px_rgba(1,41,40,0.5)] transition-all ${
                    activo
                      ? `ring-2 ${estilo.anillo}`
                      : "ring-1 ring-black/5 hover:ring-black/15"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`text-xs font-semibold uppercase tracking-[0.14em] ${estilo.etiqueta}`}
                    >
                      {estilo.titulo}
                    </span>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${estilo.chip}`}
                    >
                      <Icono className="h-4 w-4" />
                    </span>
                  </div>
                  {g ? (
                    <>
                      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span
                          className={`text-3xl font-semibold tabular-nums tracking-tight ${estilo.valor}`}
                        >
                          {formatear(numero(g, "monto_vendido"), "usd")}
                        </span>
                        <ChipVariacion
                          v={variacion(
                            numero(g, "monto_vendido"),
                            numero(gAnt, "monto_vendido"),
                            vendido,
                          )}
                          contra={mesAnteriorCorto}
                        />
                      </div>
                      <span
                        className={`mt-0.5 text-xs font-medium ${estilo.etiqueta}`}
                      >
                        vendido en {nombreMes(actual.mes, true)}
                      </span>
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        {estilo.destacadas.map((key) => {
                          const m = metricaPorKey(l, key);
                          return (
                            <div key={key}>
                              <p
                                className={`text-xl font-semibold tabular-nums ${estilo.valor}`}
                              >
                                {formatear(numero(g, key), m.formato)}
                              </p>
                              <p className={`text-xs ${estilo.etiqueta}`}>
                                {m.label}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className={`mt-4 text-sm ${estilo.etiqueta}`}>
                      Detalle por comercial
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {puedeGeneral && generalDe(actual, linea) && (
            <>
              <Panel
                titulo={`Indicadores de ${nombreMes(actual.mes, true)}`}
                icono={Activity}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {principales.map((m) => (
                    <TarjetaMetrica
                      key={m.key}
                      metrica={m}
                      subs={subsDe(m.key)}
                      actual={generalDe(actual, linea)}
                      anterior={generalDe(anterior, linea)}
                      mesAnterior={mesAnteriorCorto}
                      activa={metricaGrafico === m.key}
                      onSeleccionar={() => setMetricaGrafico(m.key)}
                    />
                  ))}
                </div>
              </Panel>

              <Panel
                titulo={`Evolución · ${metricaActiva.label}`}
                icono={Activity}
              >
                <GraficoEvolucion
                  meses={meses}
                  valores={meses.map((_, i) =>
                    valorGeneral(i, metricaActiva.key),
                  )}
                  metrica={metricaActiva}
                />
                <p className="mt-2 text-sm text-gray-400">
                  Toca una tarjeta o una fila de la tabla para ver su evolución.
                </p>
              </Panel>

              <Panel titulo="Comparativo mes a mes" icono={Activity}>
                <MatrizMeses
                  meses={meses}
                  metricas={metricas}
                  valor={valorGeneral}
                  seleccionada={metricaGrafico}
                  onSeleccionar={setMetricaGrafico}
                />
              </Panel>
            </>
          )}

          {puedeComercial && (
            <Panel
              titulo={`Por comercial · ${nombreMes(actual.mes, true)}`}
              icono={Users}
            >
              <TablaComerciales
                // Cambiar de línea cierra la evolución abierta del comercial.
                key={linea}
                linea={linea}
                meses={meses}
                datos={datos}
                total={puedeGeneral ? generalDe(actual, linea) : undefined}
              />
              <p className="mt-2 text-sm text-gray-400">
                Toca un comercial para ver su evolución en los últimos{" "}
                {meses.length} meses.
              </p>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
