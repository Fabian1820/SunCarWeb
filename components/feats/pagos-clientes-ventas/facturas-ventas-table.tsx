"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Badge } from "@/components/shared/atom/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import type {
  FacturaClienteVenta,
  FacturaVentaAgregados,
} from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";
import { Search, RefreshCw, AlertCircle, Trash2, Eye, FileDown, Receipt, Files, Loader2, FileSpreadsheet } from "lucide-react";

interface FacturasVentasTableProps {
  facturas: FacturaClienteVenta[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onEliminar?: (factura: FacturaClienteVenta) => void;
  onVerDetalles?: (factura: FacturaClienteVenta) => void;
  onExportar?: (factura: FacturaClienteVenta) => void;
  onTicket?: (factura: FacturaClienteVenta) => void;
  /** Exporta todas las facturas listadas (respetando filtros) en un único PDF, una por página. */
  onExportarTodas?: (facturas: FacturaClienteVenta[]) => Promise<void> | void;
  /**
   * Exporta a Excel las facturas listadas (respetando filtros y rango de fecha).
   * Incluye nº factura, cliente, fecha, total sin desc., descuento, aumento,
   * total, pagado, pendiente y método de pago.
   */
  onExportarExcel?: (facturas: FacturaClienteVenta[]) => Promise<void> | void;
  /** Filtro externo por moneda de pago. Solo se aplica client-side cuando el search NO está controlado. */
  monedaFilter?: string;
  /**
   * Filtro client-side por método de pago de cualquiera de los pagos de la
   * factura. Se aplica siempre (server-side ya se envía por params).
   */
  metodoFilter?: string;
  /** Rango de fecha aplicado (informativo, se muestra en el botón de Excel). */
  fechaDesde?: string;
  fechaHasta?: string;
  /** "embedded": sin borde propio, controles con padding lateral, tabla a todo el ancho */
  variant?: "default" | "embedded";
  /** Si se pasa, la búsqueda se controla externamente (server-side). */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Total absoluto reportado por el backend tras aplicar filtros. */
  totalCount?: number;
  /** Footer (ej. botón "Cargar más"). */
  footer?: React.ReactNode;
  /** Agregados del set filtrado completo (no solo la página). */
  agregados?: FacturaVentaAgregados | null;
}

export function FacturasVentasTable({
  facturas,
  loading,
  error,
  onRefresh,
  onEliminar,
  onVerDetalles,
  onExportar,
  onTicket,
  onExportarTodas,
  onExportarExcel,
  monedaFilter,
  metodoFilter,
  fechaDesde,
  fechaHasta,
  variant = "default",
  searchValue,
  onSearchChange,
  totalCount,
  footer,
  agregados,
}: FacturasVentasTableProps) {
  const isSearchControlled = searchValue !== undefined;
  const [internalSearch, setInternalSearch] = useState("");
  const search = isSearchControlled ? (searchValue as string) : internalSearch;
  const setSearch = (v: string) => {
    if (isSearchControlled) onSearchChange?.(v);
    else setInternalSearch(v);
  };
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const getFacturaId = (f: FacturaClienteVenta): string =>
    f.id || f.factura_id || f.numero_factura;
  const getSolicitudId = (f: FacturaClienteVenta): string =>
    typeof f.solicitud_venta_id === "string" ? f.solicitud_venta_id : "";
  const getSolicitudCode = (f: FacturaClienteVenta): string => {
    const id = getSolicitudId(f);
    return id ? id.slice(-6).toUpperCase() : "—";
  };
  const getSolicitudesDisplay = (f: FacturaClienteVenta): string => {
    if (Array.isArray(f.codigos_solicitudes) && f.codigos_solicitudes.length > 0) {
      return f.codigos_solicitudes.join(", ");
    }
    return getSolicitudCode(f);
  };
  const formatNum = (v?: number) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const formatCurrency = (v?: number) => {
    const s = formatNum(v);
    return s === "—" ? s : `USD ${s}`;
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    // Parsear solo la parte YYYY-MM-DD como fecha local. Construir con `new Date(d)`
    // interpreta una fecha sin zona horaria como UTC, lo que en zonas con offset
    // negativo (Cuba UTC-4/-5) muestra el día anterior.
    const [y, m, day] = d.slice(0, 10).split("-").map(Number);
    if (!y || !m || !day) return d;
    const date = new Date(y, m - 1, day);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const filtered = useMemo(() => facturas.filter((f) => {
    // monedaFilter solo se aplica client-side cuando el search NO está controlado,
    // ya que en modo server-side el backend filtra por moneda.
    if (!isSearchControlled && monedaFilter) {
      const pagos = Array.isArray(f.pagos) ? f.pagos : [];
      const tieneMoneda = pagos.length === 0
        ? monedaFilter === "USD"
        : pagos.some((p) => (p.moneda || "USD") === monedaFilter);
      if (!tieneMoneda) return false;
    }
    // metodoFilter solo se aplica client-side cuando NO estamos en modo
    // server-side (mismo patrón que monedaFilter). En modo controlado (tab 4)
    // el backend ya filtra por `metodo_pago`; un filtro client-side adicional
    // descartaría facturas cuando la proyección de pagos del listado no
    // incluye `metodo_pago`.
    if (!isSearchControlled && metodoFilter) {
      const pagos = Array.isArray(f.pagos) ? f.pagos : [];
      if (pagos.length === 0) return false;
      if (!pagos.some((p) => (p.metodo_pago || "") === metodoFilter)) return false;
    }
    if (isSearchControlled) return true;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      f.numero_factura.toLowerCase().includes(term) ||
      (f.cliente || "").toLowerCase().includes(term) ||
      (f.cliente_nombre || "").toLowerCase().includes(term) ||
      (f.cliente_numero || "").toLowerCase().includes(term) ||
      (f.comercial || "").toLowerCase().includes(term) ||
      (f.emitida_por || "").toLowerCase().includes(term) ||
      (f.emitida_por_nombre || "").toLowerCase().includes(term) ||
      getSolicitudId(f).toLowerCase().includes(term) ||
      getSolicitudesDisplay(f).toLowerCase().includes(term)
    );
  }), [facturas, search, monedaFilter, metodoFilter, isSearchControlled]);

  // Prefiere el campo del backend `total_sin_descuento` (bruto sin descuento
  // ni aumento). Fallback al cálculo legacy si el backend aún no lo expone.
  const getTotalSinDescuento = (f: FacturaClienteVenta) => {
    if (typeof f.total_sin_descuento === "number") return f.total_sin_descuento;
    return Number(f.total_a_pagar || 0) + Number(f.descuento || 0);
  };
  const getAumento = (f: FacturaClienteVenta) =>
    Number(f.aumento_monto || 0);
  const hayAumentoEnAlguna = useMemo(
    () => facturas.some((f) => getAumento(f) > 0),
    [facturas],
  );

  type MonedaTotales = { facturado: number; cobrado: number; pendiente: number; descuento: number; sinDescuento: number; aumento: number };
  const totalesPorMonedaLocal = useMemo(() => {
    const map: Record<string, MonedaTotales> = {};
    const empty = (): MonedaTotales => ({ facturado: 0, cobrado: 0, pendiente: 0, descuento: 0, sinDescuento: 0, aumento: 0 });
    for (const f of filtered) {
      const pagos = Array.isArray(f.pagos) ? f.pagos : [];
      if (pagos.length === 0) {
        const m = "USD";
        if (!map[m]) map[m] = empty();
        map[m].facturado += Number(f.total_a_pagar || 0);
        map[m].pendiente += Number(f.monto_pendiente || 0);
        map[m].descuento += Number(f.descuento || 0);
        map[m].sinDescuento += getTotalSinDescuento(f);
        map[m].aumento += getAumento(f);
      } else {
        const monedas = new Set(pagos.map((p) => p.moneda || "USD"));
        for (const moneda of monedas) {
          if (!map[moneda]) map[moneda] = empty();
          const pagosMoneda = pagos.filter((p) => (p.moneda || "USD") === moneda);
          for (const p of pagosMoneda) {
            map[moneda].cobrado += Number(p.monto || 0);
          }
        }
        if (!map["USD"]) map["USD"] = empty();
        map["USD"].facturado += Number(f.total_a_pagar || 0);
        map["USD"].pendiente += Number(f.monto_pendiente || 0);
        map["USD"].descuento += Number(f.descuento || 0);
        map["USD"].sinDescuento += getTotalSinDescuento(f);
        map["USD"].aumento += getAumento(f);
      }
    }
    return map;
  }, [filtered]);

  // Prefiere agregados del backend (set filtrado completo). Si no hay agregados,
  // usa el cálculo client-side sobre la página cargada (modo legacy).
  const totalesPorMoneda: Record<string, MonedaTotales> = useMemo(() => {
    if (!agregados) return totalesPorMonedaLocal;
    const map: Record<string, MonedaTotales> = {};
    map["USD"] = {
      facturado: agregados.facturado_usd,
      cobrado: agregados.cobrado_por_moneda?.USD ?? agregados.cobrado_usd,
      pendiente: agregados.pendiente_usd,
      descuento: agregados.descuento_usd,
      sinDescuento: agregados.facturado_sin_descuento_usd,
      aumento: agregados.aumento_monto_usd,
    };
    for (const [moneda, monto] of Object.entries(agregados.cobrado_por_moneda || {})) {
      if (moneda === "USD") continue;
      map[moneda] = {
        facturado: 0,
        cobrado: Number(monto) || 0,
        pendiente: 0,
        descuento: 0,
        sinDescuento: 0,
        aumento: 0,
      };
    }
    return map;
  }, [agregados, totalesPorMonedaLocal]);

  const em = variant === "embedded";

  return (
    <div className={em ? "" : "space-y-4"}>
      <div className={`flex items-center gap-3 ${em ? "px-6 py-4" : ""}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por número, cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" onClick={onRefresh} title="Recargar">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        {onExportarTodas && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            disabled={exportingAll || filtered.length === 0}
            title="Exportar todas las facturas listadas en un único PDF"
            onClick={async () => {
              if (filtered.length === 0) return;
              setExportingAll(true);
              try {
                await onExportarTodas(filtered);
              } finally {
                setExportingAll(false);
              }
            }}
          >
            {exportingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Files className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {exportingAll ? "Generando..." : "Exportar todas (PDF)"}
            </span>
          </Button>
        )}
        {onExportarExcel && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
            disabled={exportingExcel || filtered.length === 0}
            title={
              fechaDesde || fechaHasta
                ? `Exportar a Excel las facturas del rango ${fechaDesde || "—"} a ${fechaHasta || "—"}`
                : "Exportar a Excel las facturas listadas"
            }
            onClick={async () => {
              if (filtered.length === 0) return;
              setExportingExcel(true);
              try {
                await onExportarExcel(filtered);
              } finally {
                setExportingExcel(false);
              }
            }}
          >
            {exportingExcel ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {exportingExcel ? "Generando..." : "Exportar Excel"}
            </span>
          </Button>
        )}
        <Badge variant="secondary" className="text-xs">
          {totalCount != null
            ? `${filtered.length} de ${totalCount} facturas`
            : `${filtered.length} facturas`}
        </Badge>
      </div>

      {/* Totales según filtro activo */}
      {filtered.length > 0 && (() => {
        const usd = totalesPorMoneda["USD"] || { facturado: 0, cobrado: 0, pendiente: 0, descuento: 0, sinDescuento: 0, aumento: 0 };
        const otrasMonedas = Object.entries(totalesPorMoneda).filter(([m]) => m !== "USD").sort(([a], [b]) => a.localeCompare(b));
        return (
          <div className={`text-sm ${em ? "px-6 pb-2" : "pb-1"}`}>
            <div className="flex flex-wrap gap-3 items-start">
              <span className="text-gray-500">
                Total facturado: <strong className="text-gray-800">{formatCurrency(usd.sinDescuento)}</strong>
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500 inline-flex flex-col">
                <span>Cobrado: <strong className="text-green-700">{formatCurrency(usd.cobrado)}</strong></span>
                {otrasMonedas.map(([moneda, t]) => t.cobrado > 0 && (
                  <span key={moneda} className="pl-[4.2em]">
                    <span className={`font-semibold ${moneda === "EUR" ? "text-purple-700" : "text-blue-700"}`}>{moneda}</span>{" "}
                    <strong className={moneda === "EUR" ? "text-purple-700" : "text-blue-700"}>
                      {t.cobrado.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </span>
                ))}
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">
                Pendiente: <strong className="text-red-600">{formatCurrency(usd.pendiente)}</strong>
              </span>
              {usd.descuento > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">
                    Descuentos: <strong className="text-emerald-600">{formatCurrency(usd.descuento)}</strong>
                  </span>
                </>
              )}
              {usd.aumento > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">
                    Aumentos: <strong className="text-amber-700">{formatCurrency(usd.aumento)}</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {error && (
        <div className={`flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 ${em ? "mx-6" : ""}`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && facturas.length === 0 ? (
        <div className={`text-center py-12 text-gray-500 text-sm ${em ? "px-6 pb-6" : ""}`}>
          Cargando facturas...
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-12 text-gray-400 text-sm ${em ? "px-6 pb-6" : ""}`}>
          {search
            ? "No se encontraron facturas con ese criterio"
            : "No hay facturas emitidas"}
        </div>
      ) : (
        <div className={em ? "border-t overflow-x-auto" : "rounded-lg border overflow-x-auto"}>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Nº Factura</TableHead>
                <TableHead className="font-semibold">Solicitudes</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Fecha emisión</TableHead>
                <TableHead className="font-semibold">Emitida por</TableHead>
                <TableHead className="font-semibold text-right">Total sin desc.</TableHead>
                <TableHead className="font-semibold text-right">Descuento</TableHead>
                {hayAumentoEnAlguna && (
                  <TableHead className="font-semibold text-right">Aumento</TableHead>
                )}
                <TableHead className="font-semibold text-right">Total</TableHead>
                <TableHead className="font-semibold text-right">Pagado</TableHead>
                <TableHead className="font-semibold text-right">Pendiente</TableHead>
                {(onVerDetalles || onExportar || onTicket || onEliminar) && <TableHead className="font-semibold">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f) => (
                <TableRow key={getFacturaId(f)} className="hover:bg-gray-50 transition-colors">
                  <TableCell className="font-medium text-blue-700 text-sm">
                    {f.numero_factura}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-600">
                    {getSolicitudesDisplay(f)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{f.cliente || f.cliente_nombre || "—"}</div>
                    {f.cliente_numero && (
                      <div className="text-xs text-gray-500">
                        #{f.cliente_numero}
                      </div>
                    )}
                    {f.comercial && (
                      <div className="text-xs text-gray-500 italic">
                        Comercial: {f.comercial}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(f.fecha_emision ?? "")}
                  </TableCell>
                  <TableCell className="text-sm">{f.emitida_por_nombre || f.emitida_por}</TableCell>
                  <TableCell className="text-sm text-right text-gray-700">{formatCurrency(getTotalSinDescuento(f))}</TableCell>
                  <TableCell className="text-sm text-right text-emerald-600">{formatCurrency(f.descuento)}</TableCell>
                  {hayAumentoEnAlguna && (
                    <TableCell className="text-sm text-right text-amber-700">
                      {getAumento(f) > 0 ? formatCurrency(getAumento(f)) : <span className="text-gray-300">—</span>}
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-right">{formatCurrency(f.total_a_pagar)}</TableCell>
                  <TableCell className="text-sm text-right min-w-[180px]">
                    {Array.isArray(f.pagos) && f.pagos.length > 0 ? (
                      <div className="space-y-2">
                        {f.pagos.map((p, i) => {
                          const moneda = p.moneda || "USD";
                          const monto = Number(p.monto || 0);
                          const metodo = p.metodo_pago || "";
                          const desglose = p.desglose_billetes;
                          const desgloseEntries = desglose && typeof desglose === "object"
                            ? Object.entries(desglose).filter(([, cant]) => Number(cant) > 0)
                            : [];
                          return (
                            <div key={p.id || i} className={f.pagos!.length > 1 ? "pb-1.5 border-b border-gray-100 last:border-0 last:pb-0" : ""}>
                              <span className={`font-medium ${moneda === "USD" ? "text-green-700" : moneda === "EUR" ? "text-purple-700" : "text-blue-700"}`}>
                                {monto.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {moneda}
                              </span>
                              {moneda !== "USD" && p.tasa_cambio && Number(p.tasa_cambio) > 0 && (
                                <div className="text-[10px] text-gray-400">
                                  Tasa: {Number(p.tasa_cambio).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} → {(moneda === "EUR" ? monto * Number(p.tasa_cambio) : monto / Number(p.tasa_cambio)).toFixed(2)} USD
                                </div>
                              )}
                              {metodo === "efectivo" && desgloseEntries.length > 0 && (
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  {desgloseEntries.map(([den, cant]) => (
                                    <span key={den} className="mr-1.5">{cant}x{den}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-green-700">{formatCurrency(f.total_pagado)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-right text-red-600">{formatCurrency(f.monto_pendiente)}</TableCell>
                  {(onVerDetalles || onExportar || onTicket || onEliminar) && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {onVerDetalles && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => onVerDetalles(f)}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onExportar && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                            onClick={() => onExportar(f)}
                            title="Exportar PDF"
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                        )}
                        {onTicket && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-violet-600 hover:text-violet-800 hover:bg-violet-50"
                            onClick={() => onTicket(f)}
                            title="Exportar ticket 58mm"
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                        )}
                        {onEliminar && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onEliminar(f)}
                            title="Eliminar factura"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {/* Fila de totales. Prefiere agregados del backend (set filtrado
                  completo) sobre la suma de la página actual. */}
              {filtered.length > 1 && (() => {
                const sumSinDesc   = agregados ? agregados.facturado_sin_descuento_usd : filtered.reduce((s, f) => s + getTotalSinDescuento(f), 0);
                const sumDesc      = agregados ? agregados.descuento_usd               : filtered.reduce((s, f) => s + Number(f.descuento || 0), 0);
                const sumAumento   = agregados ? agregados.aumento_monto_usd           : filtered.reduce((s, f) => s + getAumento(f), 0);
                const sumTotal     = agregados ? agregados.facturado_usd               : filtered.reduce((s, f) => s + Number(f.total_a_pagar || 0), 0);
                const sumPagado    = agregados ? agregados.cobrado_usd                 : filtered.reduce((s, f) => s + Number(f.total_pagado || 0), 0);
                const sumPendiente = agregados ? agregados.pendiente_usd               : filtered.reduce((s, f) => s + Number(f.monto_pendiente || 0), 0);
                const label = totalCount != null
                  ? `TOTAL — ${totalCount} factura${totalCount === 1 ? "" : "s"}`
                  : `TOTAL — ${filtered.length} facturas`;
                return (
                <TableRow className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                  <TableCell colSpan={5} className="text-xs text-gray-500 py-2.5">
                    {label}
                  </TableCell>
                  <TableCell className="text-right text-sm py-2.5 text-gray-700">
                    {formatCurrency(sumSinDesc)}
                  </TableCell>
                  <TableCell className="text-right text-sm py-2.5 text-emerald-600">
                    {formatCurrency(sumDesc)}
                  </TableCell>
                  {hayAumentoEnAlguna && (
                    <TableCell className="text-right text-sm py-2.5 text-amber-700">
                      {formatCurrency(sumAumento)}
                    </TableCell>
                  )}
                  <TableCell className="text-right text-sm py-2.5 text-gray-800">
                    {formatCurrency(sumTotal)}
                  </TableCell>
                  <TableCell className="text-right text-sm py-2.5 text-green-700">
                    {formatCurrency(sumPagado)}
                  </TableCell>
                  <TableCell className="text-right text-sm py-2.5 text-red-600">
                    {formatCurrency(sumPendiente)}
                  </TableCell>
                  {(onVerDetalles || onExportar || onTicket || onEliminar) && <TableCell />}
                </TableRow>
                );
              })()}
            </TableBody>
          </Table>
        </div>
      )}
      {footer}
    </div>
  );
}
