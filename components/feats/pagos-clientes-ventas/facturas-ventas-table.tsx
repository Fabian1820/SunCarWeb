"use client";

import { useState } from "react";
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
import type { FacturaClienteVenta } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";
import { Search, RefreshCw, AlertCircle, Trash2, Eye, FileDown, Receipt, Files, Loader2 } from "lucide-react";

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
  /** "embedded": sin borde propio, controles con padding lateral, tabla a todo el ancho */
  variant?: "default" | "embedded";
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
  variant = "default",
}: FacturasVentasTableProps) {
  const [search, setSearch] = useState("");
  const [exportingAll, setExportingAll] = useState(false);
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
  const formatCurrency = (v?: number) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(n);
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

  const filtered = facturas.filter((f) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      f.numero_factura.toLowerCase().includes(term) ||
      (f.cliente || "").toLowerCase().includes(term) ||
      (f.cliente_nombre || "").toLowerCase().includes(term) ||
      (f.cliente_numero || "").toLowerCase().includes(term) ||
      (f.emitida_por || "").toLowerCase().includes(term) ||
      getSolicitudId(f).toLowerCase().includes(term) ||
      getSolicitudesDisplay(f).toLowerCase().includes(term)
    );
  });

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
        <Badge variant="secondary" className="text-xs">
          {filtered.length} facturas
        </Badge>
      </div>

      {/* Totales según filtro activo */}
      {filtered.length > 0 && (
        <div className={`flex flex-wrap gap-3 text-sm ${em ? "px-6 pb-2" : "pb-1"}`}>
          <span className="text-gray-500">
            Total facturado:{" "}
            <strong className="text-gray-800">
              {formatCurrency(filtered.reduce((s, f) => s + Number(f.total_a_pagar || 0), 0))}
            </strong>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">
            Cobrado:{" "}
            <strong className="text-green-700">
              {formatCurrency(filtered.reduce((s, f) => s + Number(f.total_pagado || 0), 0))}
            </strong>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">
            Pendiente:{" "}
            <strong className="text-red-600">
              {formatCurrency(filtered.reduce((s, f) => s + Number(f.monto_pendiente || 0), 0))}
            </strong>
          </span>
          {filtered.some((f) => Number(f.descuento) > 0) && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">
                Descuentos:{" "}
                <strong className="text-orange-600">
                  {formatCurrency(filtered.reduce((s, f) => s + Number(f.descuento || 0), 0))}
                </strong>
              </span>
            </>
          )}
        </div>
      )}

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
                <TableHead className="font-semibold text-right">Total</TableHead>
                <TableHead className="font-semibold text-right">Descuento</TableHead>
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
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(f.fecha_emision ?? "")}
                  </TableCell>
                  <TableCell className="text-sm">{f.emitida_por}</TableCell>
                  <TableCell className="text-sm text-right">{formatCurrency(f.total_a_pagar)}</TableCell>
                  <TableCell className="text-sm text-right text-orange-600">{formatCurrency(f.descuento)}</TableCell>
                  <TableCell className="text-sm text-right text-green-700">{formatCurrency(f.total_pagado)}</TableCell>
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
              {/* Fila de totales */}
              {filtered.length > 1 && (
                <TableRow className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                  <TableCell colSpan={5} className="text-xs text-gray-500 py-2.5">
                    TOTAL — {filtered.length} facturas
                  </TableCell>
                  <TableCell className="text-right text-sm py-2.5 text-gray-800">
                    {formatCurrency(filtered.reduce((s, f) => s + Number(f.total_a_pagar || 0), 0))}
                  </TableCell>
                  <TableCell className="text-right text-sm py-2.5 text-orange-600">
                    {formatCurrency(filtered.reduce((s, f) => s + Number(f.descuento || 0), 0))}
                  </TableCell>
                  <TableCell className="text-right text-sm py-2.5 text-green-700">
                    {formatCurrency(filtered.reduce((s, f) => s + Number(f.total_pagado || 0), 0))}
                  </TableCell>
                  <TableCell className="text-right text-sm py-2.5 text-red-600">
                    {formatCurrency(filtered.reduce((s, f) => s + Number(f.monto_pendiente || 0), 0))}
                  </TableCell>
                  {(onVerDetalles || onExportar || onTicket || onEliminar) && <TableCell />}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
