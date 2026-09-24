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
import type {
  SolicitudVentaSummary,
  SolicitudVentaSummaryAgregados,
} from "@/lib/api-types";
import { Search, CreditCard, RefreshCw, AlertCircle, Ban, ExternalLink } from "lucide-react";
import { normalizeSearchText } from "@/lib/utils/string-utils";
import { parseFechaUtc } from "@/lib/utils/fecha-utc";

interface SolicitudesPendientesPagoTableProps {
  solicitudes: SolicitudVentaSummary[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onPagar?: (solicitud: SolicitudVentaSummary) => void;
  /** Abre la confirmación para cancelar la cuenta por cobrar de la solicitud. */
  onCancelarCuenta?: (solicitud: SolicitudVentaSummary) => void;
  onVerStripe?: (solicitud: SolicitudVentaSummary) => void;
  /** Si false, muestra también las anuladas (por defecto true = las oculta) */
  ocultarAnuladas?: boolean;
  /** "embedded": sin borde propio, controles con padding lateral, tabla a todo el ancho */
  variant?: "default" | "embedded";
  /** Si se pasa, la búsqueda se controla externamente (server-side). Cuando es `undefined`, se usa estado local. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Total absoluto reportado por el backend (cuando search/filtros son server-side). */
  totalCount?: number;
  /** Footer (ej. botón "Cargar más"). */
  footer?: React.ReactNode;
  /** Agregados del set filtrado completo (no solo la página). */
  agregados?: SolicitudVentaSummaryAgregados | null;
}

export function SolicitudesPendientesPagoTable({
  solicitudes,
  loading,
  error,
  onRefresh,
  onPagar,
  onCancelarCuenta,
  onVerStripe,
  ocultarAnuladas = true,
  variant = "default",
  searchValue,
  onSearchChange,
  totalCount,
  footer,
  agregados,
}: SolicitudesPendientesPagoTableProps) {
  const isSearchControlled = searchValue !== undefined;
  const [internalSearch, setInternalSearch] = useState("");
  const search = isSearchControlled ? (searchValue as string) : internalSearch;
  const setSearch = (v: string) => {
    if (isSearchControlled) onSearchChange?.(v);
    else setInternalSearch(v);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(v);

  const formatFechaCancelacion = (valor?: string | null) => {
    const fecha = parseFechaUtc(valor ?? undefined);
    if (!fecha) return "";
    return fecha.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const hayAcciones = Boolean(onPagar || onCancelarCuenta);

  const getMaterialesLineas = (s: SolicitudVentaSummary) => {
    if (!s.materiales?.length) return null;
    return s.materiales.map((m, i) => {
      const nombre =
        m.material_nombre || m.material_descripcion || m.material_codigo || m.material_id;
      return (
        <div key={i} className="flex items-baseline justify-between gap-2 leading-5">
          <span className="text-xs text-gray-600">
            <span className="font-medium text-gray-800">{m.cantidad}x</span> {nombre}
          </span>
          {m.subtotal != null && (
            <span className="text-xs text-gray-500 whitespace-nowrap">
              ${Number(m.subtotal).toFixed(2)}
            </span>
          )}
        </div>
      );
    });
  };


  const filtered = solicitudes.filter((s) => {
    if (ocultarAnuladas && s.estado === "anulada") return false;
    // Si el search lo controla la página (server-side), no filtramos de nuevo aquí.
    if (isSearchControlled) return true;
    if (!search.trim()) return true;
    const term = normalizeSearchText(search);
    return (
      normalizeSearchText((s.codigo || "")).includes(term) ||
      normalizeSearchText((s.cliente_venta_nombre || "")).includes(term) ||
      normalizeSearchText((s.comercial || "")).includes(term)
    );
  });

  const e = variant === "embedded";

  return (
    <div className={e ? "" : "space-y-4"}>
      <div className={`flex items-center gap-3 ${e ? "px-6 py-4" : ""}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por cliente, código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          title="Recargar"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Badge variant="secondary" className="text-xs">
          {totalCount != null
            ? `${filtered.length} de ${totalCount} solicitudes`
            : `${filtered.length} solicitudes`}
        </Badge>
      </div>

      {agregados && (
        <div className={`text-sm ${e ? "px-6 pb-2" : "pb-1"}`}>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-gray-500">
              Total de cuentas por cobrar: <strong className="text-blue-700">{formatCurrency(agregados.precio_total_usd)}</strong>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              Cobrado: <strong className="text-green-700">{formatCurrency(agregados.pagado_usd)}</strong>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              Pendiente: <strong className="text-red-600">{formatCurrency(agregados.pendiente_usd)}</strong>
            </span>
            {(agregados.canceladas ?? 0) > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-gray-400" title="Cuentas canceladas: no suman en los totales de arriba">
                  Canceladas ({agregados.canceladas}):{" "}
                  <strong className="text-gray-500">{formatCurrency(agregados.cancelado_usd ?? 0)}</strong>
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className={`flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 ${e ? "mx-6" : ""}`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && solicitudes.length === 0 ? (
        <div className={`text-center py-12 text-gray-500 text-sm ${e ? "px-6 pb-6" : ""}`}>
          Cargando solicitudes pendientes...
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-12 text-gray-400 text-sm ${e ? "px-6 pb-6" : ""}`}>
          {search
            ? "No se encontraron solicitudes con ese criterio"
            : "No hay solicitudes pendientes de pago"}
        </div>
      ) : (
        <div className={e ? "border-t overflow-x-auto" : "rounded-lg border overflow-x-auto"}>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Código</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Materiales</TableHead>
                <TableHead className="font-semibold text-right">
                  Total
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Cobrado
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Pendiente
                </TableHead>
                {hayAcciones && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const precioTotal = s.precio_total != null ? Number(s.precio_total) : null;
                const pagado = s.total_pagado != null ? Number(s.total_pagado) : null;
                const pendiente = s.monto_pendiente != null ? Number(s.monto_pendiente) : null;

                const tienePagos = pagado != null && Number.isFinite(pagado) && pagado > 0;
                const tienePendiente = pendiente != null && Number.isFinite(pendiente) && pendiente > 0;
                const isPagada = !tienePendiente && tienePagos;
                const cancelada = Boolean(s.cuenta_cancelada);
                // Una cancelada sigue saliendo, pero apagada y con los importes tachados.
                const tachado = cancelada ? "line-through text-gray-400" : "";

                return (
                  <TableRow
                    key={s.id}
                    className={cancelada ? "bg-gray-50 text-gray-500" : "hover:bg-gray-50"}
                  >
                    <TableCell className="font-mono text-xs">
                      {s.codigo || s.id.slice(-6).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {s.cliente_venta_nombre || "Sin nombre"}
                      </div>
                      {s.comercial && (
                        <div className="text-xs text-gray-500 italic">
                          Comercial: {s.comercial}
                        </div>
                      )}
                      {cancelada && (
                        <div className="mt-1 text-xs text-gray-500">
                          <Badge variant="outline" className="border-gray-300 bg-gray-100 text-gray-600 gap-1">
                            <Ban className="h-3 w-3" />
                            Cuenta cancelada
                          </Badge>
                          <div className="mt-1">
                            {formatFechaCancelacion(s.cuenta_cancelada_en)}
                            {(s.cuenta_cancelada_por_nombre || s.cuenta_cancelada_por_ci) &&
                              ` · por ${s.cuenta_cancelada_por_nombre || s.cuenta_cancelada_por_ci}`}
                          </div>
                          {s.cuenta_cancelada_motivo && (
                            <div className="italic">Motivo: {s.cuenta_cancelada_motivo}</div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      {getMaterialesLineas(s) ?? <span className="text-gray-400 text-xs">—</span>}
                    </TableCell>
                    <TableCell className={`text-right font-medium text-sm ${cancelada ? tachado : "text-blue-700"}`}>
                      {precioTotal != null ? formatCurrency(precioTotal) : <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className={`text-right text-sm ${cancelada ? tachado : "text-green-700"}`}>
                      {pagado != null ? formatCurrency(pagado) : <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className={`text-right text-sm font-semibold ${cancelada ? tachado : "text-red-600"}`}>
                      {pendiente != null ? formatCurrency(pendiente) : <span className="text-gray-400">—</span>}
                    </TableCell>
                    {hayAcciones && (
                      <TableCell>
                        {cancelada ? (
                          <span className="text-xs font-medium text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
                            Cancelada
                          </span>
                        ) : isPagada ? (
                          <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                            Pagada
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1.5 items-stretch">
                            {onPagar && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white gap-1"
                                onClick={() => onPagar(s)}
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                Pagar
                              </Button>
                            )}
                            {onCancelarCuenta && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                disabled={Boolean(s.tiene_factura)}
                                title={
                                  s.tiene_factura
                                    ? `Ya está facturada${s.factura_numero ? ` (${s.factura_numero})` : ""}: no se puede cancelar la cuenta por cobrar`
                                    : "Cancelar cuenta por cobrar"
                                }
                                onClick={() => onCancelarCuenta(s)}
                              >
                                <Ban className="h-3.5 w-3.5" />
                                Cancelar cuenta
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {footer}
    </div>
  );
}
