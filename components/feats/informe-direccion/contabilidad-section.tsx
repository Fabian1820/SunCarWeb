"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileDown, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { MonthPicker } from "@/components/shared/molecule/month-picker";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { useToast } from "@/hooks/use-toast";
import { ContabilidadFinancieraService } from "@/lib/api-services";
import type {
  CategoriaContabilidad,
  ContabilidadIngresos,
  ContabilidadMovimiento,
  ContabilidadResumen,
  MontosPorMoneda,
} from "@/lib/api-types";
import { exportListToPDF } from "@/lib/export-list-pdf";

type ModoFiltro = "mes" | "rango";

function formatoMoneda(codigo: string) {
  try {
    return new Intl.NumberFormat("es-CU", { style: "currency", currency: codigo, minimumFractionDigits: 2 });
  } catch {
    return new Intl.NumberFormat("es-CU", { minimumFractionDigits: 2 });
  }
}

function formatMonto(codigo: string, monto: number) {
  return formatoMoneda(codigo).format(monto);
}

const ORDEN_MONEDAS = ["USD", "EUR", "CUP", "MLC"];

function ordenarMonedas(monedas: Iterable<string>): string[] {
  return Array.from(new Set(monedas)).sort((a, b) => {
    const ia = ORDEN_MONEDAS.indexOf(a);
    const ib = ORDEN_MONEDAS.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b);
  });
}

/**
 * Lista vertical alineada por moneda, para las 3 tarjetas de resumen: recibe
 * siempre el mismo `monedas` (unión de las 3 tarjetas) para que USD/EUR/CUP
 * queden en la misma fila en las tres, aunque una tarjeta tenga 0 en alguna.
 */
function MontosPorMonedaLista({ monedas, montos }: { monedas: string[]; montos: MontosPorMoneda }) {
  return (
    <div className="space-y-0.5">
      {monedas.map((moneda) => (
        <div key={moneda} className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium text-gray-500">{moneda}</span>
          <span className="tabular-nums">{formatMonto(moneda, montos[moneda] ?? 0)}</span>
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
          className="inline-flex whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
        >
          {formatMonto(moneda, montos[moneda])}
        </span>
      ))}
    </div>
  );
}

type AgrupacionIngresos = "tipo" | "persona";

/**
 * Lista de grupos (tipo o persona), cada uno desplegable para ver los
 * movimientos individuales que lo componen (ej. qué oferta/cliente pagó qué).
 */
function ListaGruposDesglosable({
  grupos,
  movimientos,
  agruparPor,
}: {
  grupos: { clave: string; etiqueta: string; por_moneda: MontosPorMoneda }[];
  movimientos: ContabilidadMovimiento[];
  agruparPor: AgrupacionIngresos;
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
              className="w-full flex items-center justify-between gap-4 px-3 py-2.5 text-left hover:bg-gray-50 disabled:hover:bg-white"
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
                <table className="w-full text-xs">
                  <tbody>
                    {detalle.map((m, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function IngresosDesplegable({
  titulo,
  ingresos,
  abierto,
  onToggle,
}: {
  titulo: string;
  ingresos: ContabilidadIngresos;
  abierto: boolean;
  onToggle: () => void;
}) {
  const sinDatos = Object.keys(ingresos.por_moneda).length === 0;
  const [agrupacion, setAgrupacion] = useState<AgrupacionIngresos>("tipo");

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        disabled={sinDatos}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-emerald-50/40 disabled:hover:bg-white disabled:cursor-default text-left"
      >
        <span className="flex items-center gap-2 font-medium text-gray-800">
          {sinDatos ? (
            <span className="w-4" />
          ) : abierto ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
          {titulo}
        </span>
        <MontosPorMonedaLine montos={ingresos.por_moneda} />
      </button>

      {abierto && !sinDatos && (
        <div className="border-t bg-gray-50/60">
          <div className="flex items-center gap-1 px-3 py-2 border-b bg-white">
            <button
              type="button"
              onClick={() => setAgrupacion("tipo")}
              className={`rounded px-2.5 py-1 text-xs font-medium ${
                agrupacion === "tipo" ? "bg-emerald-700 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Por tipo
            </button>
            <button
              type="button"
              onClick={() => setAgrupacion("persona")}
              className={`rounded px-2.5 py-1 text-xs font-medium ${
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
                grupos={ingresos.por_tipo.map((t) => ({ clave: t.tipo, etiqueta: t.label, por_moneda: t.por_moneda }))}
              />
            ) : (
              <ListaGruposDesglosable
                agruparPor="persona"
                movimientos={ingresos.movimientos}
                grupos={ingresos.por_persona.map((p) => ({ clave: p.persona, etiqueta: p.persona, por_moneda: p.por_moneda }))}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ContabilidadSection() {
  const [modo, setModo] = useState<ModoFiltro>("mes");
  const [mes, setMes] = useState(mesActualYYYYMM());
  const [rango, setRango] = useState(() => {
    const r = primerYUltimoDiaDeMes(mesActualYYYYMM())!;
    return r;
  });
  const [resumen, setResumen] = useState<ContabilidadResumen | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
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

  // Carga automática: al entrar (mes actual por defecto) y cada vez que cambia el filtro.
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta]);

  const toggleExpandido = (key: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const exportarPdf = async () => {
    if (!resumen) return;
    const filas = [
      {
        categoria: "General (todo)",
        ingresos: Object.entries(resumen.general.ingresos.por_moneda)
          .map(([m, v]) => formatMonto(m, v))
          .join(" / "),
      },
      ...resumen.por_categoria.map((c) => ({
        categoria: c.label,
        ingresos: Object.entries(c.ingresos.por_moneda)
          .map(([m, v]) => formatMonto(m, v))
          .join(" / ") || "—",
      })),
    ];
    await exportListToPDF({
      title: "Contabilidad — Ingresos",
      subtitle: `Del ${resumen.inicio.slice(0, 10)} al ${resumen.fin.slice(0, 10)}`,
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Contabilidad</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
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

          <Button variant="outline" onClick={cargar} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Actualizar
          </Button>
          <Button variant="outline" onClick={exportarPdf} disabled={!resumen}>
            <FileDown className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>

        {resumen ? (
          <div className="space-y-6">
            {(() => {
              const monedasResumen = ordenarMonedas([
                ...Object.keys(resumen.general.ingresos.por_moneda),
                ...Object.keys(resumen.general.gastos.por_moneda),
                ...Object.keys(resumen.general.saldo.por_moneda),
              ]);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-emerald-50/60 p-4">
                    <p className="text-xs font-medium text-emerald-800 mb-2">Ingresos totales</p>
                    <div className="text-base font-semibold text-emerald-900">
                      <MontosPorMonedaLista monedas={monedasResumen} montos={resumen.general.ingresos.por_moneda} />
                    </div>
                  </div>
                  <div className="rounded-lg border bg-rose-50/60 p-4">
                    <p className="text-xs font-medium text-rose-800 mb-2">Gastos totales (empresa)</p>
                    <div className="text-base font-semibold text-rose-900">
                      <MontosPorMonedaLista monedas={monedasResumen} montos={resumen.general.gastos.por_moneda} />
                    </div>
                  </div>
                  <div className="rounded-lg border bg-teal-50/60 p-4">
                    <p className="text-xs font-medium text-teal-800 mb-2">Saldo disponible (empresa)</p>
                    <div className="text-base font-semibold text-teal-900">
                      <MontosPorMonedaLista monedas={monedasResumen} montos={resumen.general.saldo.por_moneda} />
                    </div>
                  </div>
                </div>
              );
            })()}

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Ingresos por categoría</p>
              <div className="space-y-2">
                {resumen.por_categoria.map((c) => (
                  <IngresosDesplegable
                    key={c.categoria}
                    titulo={c.label}
                    ingresos={c.ingresos}
                    abierto={expandidos.has(c.categoria)}
                    onToggle={() => toggleExpandido(c.categoria)}
                  />
                ))}
              </div>
            </div>
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

export type { CategoriaContabilidad };
