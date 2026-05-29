"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Badge } from "@/components/shared/atom/badge";
import { Loader2, BookmarkCheck, Calendar, User, Warehouse, Package, Layers } from "lucide-react";
import { ReservaVentaService } from "@/lib/services/feats/reservas-ventas/reserva-venta-service";
import type { Reserva, ReservaEstado } from "@/lib/api-types";
import type { StockPools } from "@/lib/types/feats/inventario/inventario-types";
import { POOLS_STOCK, POOL_STOCK_LABELS } from "@/lib/types/feats/inventario/inventario-types";

interface ReservasPorMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  almacenId: string;
  materialId: string;
  materialNombre?: string;
  /** Distribución por pool del material en este almacén. Si está presente, se muestra como cabecera. */
  pools?: StockPools;
  /** Unidad de medida opcional, para mostrar al lado de cantidades en la cabecera. */
  um?: string;
}

const POOL_COLORS: Record<keyof StockPools, { bar: string; text: string }> = {
  indistinto:  { bar: "bg-emerald-500", text: "text-emerald-700" },
  instaladora: { bar: "bg-blue-500",    text: "text-blue-700" },
  ventas:      { bar: "bg-amber-500",   text: "text-amber-700" },
};

const estadoBadgeProps = (estado: ReservaEstado): { className: string; label: string } => {
  switch (estado) {
    case "activa":
      return { className: "bg-green-50 text-green-700 border-green-200", label: "Activa" };
    case "cancelada":
      return { className: "bg-red-50 text-red-700 border-red-200", label: "Cancelada" };
    case "expirada":
      return { className: "bg-gray-50 text-gray-600 border-gray-200", label: "Expirada" };
    case "consumida":
      return { className: "bg-blue-50 text-blue-700 border-blue-200", label: "Consumida" };
    default:
      return { className: "bg-gray-50 text-gray-600 border-gray-200", label: estado };
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const isExpiringSoon = (fechaExpiracion: string): boolean => {
  const expiry = new Date(fechaExpiracion);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 3;
};

export function ReservasPorMaterialDialog({
  open,
  onOpenChange,
  almacenId,
  materialId,
  materialNombre,
  pools,
  um,
}: ReservasPorMaterialDialogProps) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !almacenId || !materialId) return;
    setLoading(true);
    setError(null);
    ReservaVentaService.getReservasPorMaterial(almacenId, materialId)
      .then(({ data, total: t }) => {
        setReservas(data);
        setTotal(t);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error al cargar reservas");
        setReservas([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [open, almacenId, materialId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-indigo-600" />
            Reservas activas
          </DialogTitle>
          <DialogDescription>
            {materialNombre ? `Material: ${materialNombre}` : "Reservas para este material en el almacén"}
            {!loading && ` · ${total} reserva${total !== 1 ? "s" : ""}`}
          </DialogDescription>
        </DialogHeader>

        {pools && POOLS_STOCK.some((p) => pools[p].cantidad_reservada > 0 || pools[p].cantidad > 0) && (() => {
          const totalCantidad = POOLS_STOCK.reduce((s, p) => s + pools[p].cantidad, 0);
          const totalReservada = POOLS_STOCK.reduce((s, p) => s + pools[p].cantidad_reservada, 0);
          return (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-3 mb-2 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                  Distribución por pool en este almacén
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-white">
                {POOLS_STOCK.map((p) => {
                  const c = pools[p].cantidad;
                  if (c === 0 || totalCantidad === 0) return null;
                  const pct = (c / totalCantidad) * 100;
                  return (
                    <div
                      key={p}
                      className={POOL_COLORS[p].bar}
                      style={{ width: `${pct}%` }}
                      title={`${POOL_STOCK_LABELS[p]}: ${c}`}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {POOLS_STOCK.map((p) => {
                  const info = pools[p];
                  return (
                    <div key={p} className="rounded border border-white bg-white px-2 py-1.5">
                      <div className={`flex items-center gap-1 font-semibold ${POOL_COLORS[p].text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${POOL_COLORS[p].bar}`} />
                        {POOL_STOCK_LABELS[p]}
                      </div>
                      <div className="text-gray-900 font-bold text-base mt-0.5">
                        {info.cantidad}{um ? <span className="text-[10px] font-medium text-gray-500 ml-0.5">{um}</span> : null}
                      </div>
                      {info.cantidad_reservada > 0 && (
                        <div className="text-[10px] text-amber-700">
                          {info.cantidad_reservada} reservada{info.cantidad_reservada !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {totalReservada > 0 && (
                <div className="text-[11px] text-gray-500 border-t border-indigo-100 pt-2">
                  Total reservado en todos los pools: <strong className="text-amber-700">{totalReservada}{um ? ` ${um}` : ""}</strong>
                </div>
              )}
            </div>
          );
        })()}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-600 text-sm">{error}</div>
        ) : reservas.length === 0 ? (
          <div className="text-center py-10">
            <BookmarkCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay reservas activas para este material.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 font-semibold text-gray-900">ID</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-900">Estado</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-900">Cliente</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-900">Almacén</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-900">Reservado / Consumido</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-900">Fecha reserva</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-900">Expiración</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((reserva) => {
                  const { className: badgeClass, label: badgeLabel } = estadoBadgeProps(reserva.estado);
                  const isActiva = reserva.estado === "activa";
                  const expiringSoon = isActiva && isExpiringSoon(reserva.fecha_expiracion);

                  // Datos específicos de este material en la reserva
                  const materialEnReserva = reserva.materiales?.find(
                    (m) => m.material_id === materialId,
                  );
                  const cantidadReservada = materialEnReserva?.cantidad_reservada ?? 0;
                  const cantidadConsumida = materialEnReserva?.cantidad_consumida ?? 0;

                  return (
                    <tr key={reserva.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <Badge
                          variant="outline"
                          className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-xs"
                        >
                          {reserva.reserva_id || reserva.id.slice(-8).toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className={badgeClass}>
                          {badgeLabel}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-900">
                            {reserva.cliente_nombre || reserva.cliente_id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <Warehouse className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-900">
                            {reserva.almacen_nombre || reserva.almacen_id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="font-semibold text-gray-900">{cantidadReservada}</span>
                          <span className="text-gray-400 text-xs">
                            ({cantidadConsumida} consumido{cantidadConsumida !== 1 ? "s" : ""})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">{formatDate(reserva.fecha_reserva)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={expiringSoon ? "text-amber-600 font-medium" : "text-gray-700"}>
                          {formatDate(reserva.fecha_expiracion)}
                          {expiringSoon && <span className="ml-1 text-xs text-amber-500">¡Pronto!</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
