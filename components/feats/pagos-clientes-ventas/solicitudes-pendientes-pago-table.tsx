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
import type { SolicitudVenta } from "@/lib/api-types";
import { Search, CreditCard, RefreshCw, AlertCircle } from "lucide-react";

interface SolicitudesPendientesPagoTableProps {
  solicitudes: SolicitudVenta[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onPagar?: (solicitud: SolicitudVenta) => void;
  /** Si false, muestra también las anuladas (por defecto true = las oculta) */
  ocultarAnuladas?: boolean;
  /** "embedded": sin borde propio, controles con padding lateral, tabla a todo el ancho */
  variant?: "default" | "embedded";
}

export function SolicitudesPendientesPagoTable({
  solicitudes,
  loading,
  error,
  onRefresh,
  onPagar,
  ocultarAnuladas = true,
  variant = "default",
}: SolicitudesPendientesPagoTableProps) {
  const [search, setSearch] = useState("");

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(v);

  const getMaterialesLineas = (s: SolicitudVenta) => {
    if (!s.materiales?.length) return null;
    return s.materiales.map((m, i) => {
      const nombre =
        m.material?.nombre ||
        m.material?.descripcion ||
        m.material_descripcion ||
        m.descripcion ||
        m.material_id;
      const precioUnit = m.precio ?? m.material?.precio;
      return (
        <div key={i} className="flex items-baseline justify-between gap-2 leading-5">
          <span className="text-xs text-gray-600">
            <span className="font-medium text-gray-800">{m.cantidad}x</span> {nombre}
          </span>
          {precioUnit != null && (
            <span className="text-xs text-gray-500 whitespace-nowrap">
              ${Number(m.subtotal ?? precioUnit * m.cantidad).toFixed(2)}
            </span>
          )}
        </div>
      );
    });
  };

  const getPrecioMateriales = (s: SolicitudVenta) => {
    if (s.precio_total != null) return Number(s.precio_total);
    return (s.materiales ?? []).reduce((sum, m) => {
      if (m.subtotal != null) return sum + Number(m.subtotal);
      const precio = m.precio ?? m.material?.precio ?? 0;
      return sum + precio * m.cantidad;
    }, 0);
  };

  const filtered = solicitudes.filter((s) => {
    if (ocultarAnuladas && s.estado === "anulada") return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const clienteNombre = s.cliente_venta?.nombre || "";
    const clienteNumero = s.cliente_venta?.numero || s.cliente_venta_id || "";
    return (
      (s.codigo || "").toLowerCase().includes(term) ||
      clienteNombre.toLowerCase().includes(term) ||
      clienteNumero.toLowerCase().includes(term) ||
      (s.almacen?.nombre || "").toLowerCase().includes(term)
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
          {filtered.length} solicitudes
        </Badge>
      </div>

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
                  Precio materiales
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Descuento
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Total
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Pagado
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Pendiente
                </TableHead>
                {onPagar && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const precioMateriales = getPrecioMateriales(s);
                const descuento = Number(s.descuento_porcentaje ?? 0);
                const total =
                  s.precio_total != null
                    ? Number(s.precio_total)
                    : precioMateriales * (1 - descuento / 100);
                const pagado = Number(s.total_pagado ?? 0);
                const pendiente =
                  s.saldo_pendiente != null
                    ? Number(s.saldo_pendiente)
                    : Math.max(0, total - pagado);

                return (
                  <TableRow key={s.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-xs">
                      {s.codigo || s.id.slice(-6).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {s.cliente_venta?.nombre || "Sin nombre"}
                      </div>
                      {s.cliente_venta?.telefono && (
                        <div className="text-xs text-gray-500">
                          {s.cliente_venta.telefono}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      {getMaterialesLineas(s) ?? <span className="text-gray-400 text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(precioMateriales)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {descuento > 0 ? (
                        <span className="text-orange-600">{descuento}%</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm text-blue-700">
                      {formatCurrency(total)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-green-700">
                      {formatCurrency(pagado)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-red-600">
                      {formatCurrency(pendiente)}
                    </TableCell>
                    {onPagar && (
                      <TableCell>
                        {pendiente > 0 ? (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white gap-1"
                            onClick={() => onPagar(s)}
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Pagar
                          </Button>
                        ) : (
                          <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                            Pagado
                          </span>
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
    </div>
  );
}
