"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Badge } from "@/components/shared/atom/badge";
import {
  BookmarkCheck,
  Calendar,
  Package,
  User,
  Warehouse,
  Zap,
} from "lucide-react";
import type { Reserva, ReservaEstado } from "@/lib/api-types";

interface ReservaVentaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserva: Reserva | null;
}

const estadoBadgeProps = (
  estado: ReservaEstado,
): { className: string; label: string } => {
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
  return parsed.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function ReservaVentaDetailDialog({
  open,
  onOpenChange,
  reserva,
}: ReservaVentaDetailDialogProps) {
  if (!reserva) return null;

  const { className: badgeClass, label: badgeLabel } = estadoBadgeProps(reserva.estado);

  const totalReservado = reserva.materiales?.reduce(
    (sum, m) => sum + m.cantidad_reservada,
    0,
  ) ?? 0;
  const totalConsumido = reserva.materiales?.reduce(
    (sum, m) => sum + (m.cantidad_consumida ?? 0),
    0,
  ) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-indigo-600" />
            Detalle de Reserva
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono"
            >
              {reserva.reserva_id || reserva.id.slice(-8).toUpperCase()}
            </Badge>
            <Badge variant="outline" className={badgeClass}>
              {badgeLabel}
            </Badge>
            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
              Origen: ventas
            </Badge>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-900">
                  {reserva.cliente_nombre || "-"}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Almacén</p>
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-900">
                  {reserva.almacen_nombre || "-"}
                </p>
              </div>
            </div>

            {reserva.oferta_nombre && (
              <div className="space-y-1 col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Oferta</p>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-gray-900">{reserva.oferta_nombre}</span>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha Reserva</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{formatDate(reserva.fecha_reserva)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expiración</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{formatDate(reserva.fecha_expiracion)}</span>
              </div>
            </div>

            {reserva.fecha_cierre && (
              <div className="space-y-1 col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha Cierre</p>
                <span className="text-sm text-gray-700">{formatDate(reserva.fecha_cierre)}</span>
              </div>
            )}
          </div>

          {/* Materiales */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                Materiales ({reserva.materiales?.length ?? 0})
              </p>
              <span className="text-xs text-gray-500">
                Consumido: {totalConsumido} / {totalReservado}
              </span>
            </div>

            {reserva.materiales && reserva.materiales.length > 0 ? (
              <div className="border rounded-md divide-y">
                {reserva.materiales.map((m, i) => {
                  const consumido = m.cantidad_consumida ?? 0;
                  const pct = m.cantidad_reservada > 0
                    ? Math.round((consumido / m.cantidad_reservada) * 100)
                    : 0;
                  const consumidoTotal = consumido >= m.cantidad_reservada;
                  const nombreCompleto = [m.nombre, m.descripcion]
                    .filter(Boolean)
                    .join(" — ");

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50"
                    >
                      {/* Icono */}
                      <Package className="h-4 w-4 text-gray-300 shrink-0" />

                      {/* Info material */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium text-gray-900 truncate"
                          title={nombreCompleto || undefined}
                        >
                          {m.nombre ?? "-"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {m.codigo && (
                            <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1 rounded">
                              {m.codigo}
                            </span>
                          )}
                          {m.descripcion && (
                            <span
                              className="text-xs text-gray-400 truncate max-w-[200px]"
                              title={m.descripcion}
                            >
                              {m.descripcion}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Cantidades */}
                      <div className="shrink-0 flex items-center gap-3 text-sm">
                        <div className="text-right">
                          <p className="text-xs text-gray-400 leading-none mb-0.5">Reservado</p>
                          <p className="font-medium text-gray-800">{m.cantidad_reservada}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400 leading-none mb-0.5">Consumido</p>
                          <p className={`font-medium ${consumidoTotal ? "text-green-600" : "text-gray-700"}`}>
                            {consumido}
                            <span className="text-xs font-normal text-gray-400 ml-1">
                              ({pct}%)
                            </span>
                          </p>
                        </div>
                        <div>
                          {consumidoTotal ? (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
                              Completo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap">
                              Parcial
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Sin materiales</p>
            )}
          </div>

          {/* Footer meta */}
          <div className="pt-2 border-t text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
            <span>Creado: {formatDate(reserva.fecha_creacion)}</span>
            <span>Actualizado: {formatDate(reserva.fecha_actualizacion)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
