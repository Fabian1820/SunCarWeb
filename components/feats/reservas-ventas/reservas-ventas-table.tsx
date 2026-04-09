"use client";

import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  Ban,
  BookmarkCheck,
  Calendar,
  Eye,
  Package,
  Pencil,
  User,
  Warehouse,
} from "lucide-react";
import type { Reserva, ReservaEstado } from "@/lib/api-types";

interface ReservasVentasTableProps {
  reservas: Reserva[];
  onView?: (reserva: Reserva) => void;
  onEdit?: (reserva: Reserva) => void;
  onCancelar?: (reserva: Reserva) => void;
  onConsumir?: (reserva: Reserva) => void;
}

const estadoBadgeProps = (
  estado: ReservaEstado,
): { className: string; label: string } => {
  switch (estado) {
    case "activa":
      return {
        className:
          "bg-green-50 text-green-700 border-green-200",
        label: "Activa",
      };
    case "cancelada":
      return {
        className:
          "bg-red-50 text-red-700 border-red-200",
        label: "Cancelada",
      };
    case "expirada":
      return {
        className:
          "bg-gray-50 text-gray-600 border-gray-200",
        label: "Expirada",
      };
    case "consumida":
      return {
        className:
          "bg-blue-50 text-blue-700 border-blue-200",
        label: "Consumida",
      };
    default:
      return {
        className: "bg-gray-50 text-gray-600 border-gray-200",
        label: estado,
      };
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

export function ReservasVentasTable({
  reservas,
  onView,
  onEdit,
  onCancelar,
  onConsumir,
}: ReservasVentasTableProps) {
  if (reservas.length === 0) {
    return (
      <div className="text-center py-12">
        <BookmarkCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay reservas de ventas
        </h3>
        <p className="text-gray-600">
          Crea una nueva reserva para comenzar.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">ID Reserva</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Cliente</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Almacén</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Materiales</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha Reserva</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Expiración</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {reservas.map((reserva) => {
            const { className: badgeClass, label: badgeLabel } =
              estadoBadgeProps(reserva.estado);
            const isActiva = reserva.estado === "activa";
            const expiringSoon =
              isActiva && isExpiringSoon(reserva.fecha_expiracion);
            const totalMateriales = reserva.materiales?.length ?? 0;
            const totalConsumido = reserva.materiales?.reduce(
              (sum, m) => sum + (m.cantidad_consumida ?? 0),
              0,
            ) ?? 0;
            const totalReservado = reserva.materiales?.reduce(
              (sum, m) => sum + (m.cantidad_reservada ?? 0),
              0,
            ) ?? 0;

            return (
              <tr
                key={reserva.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                {/* ID */}
                <td className="py-4 px-4">
                  <Badge
                    variant="outline"
                    className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-xs"
                  >
                    {reserva.reserva_id || reserva.id.slice(-8).toUpperCase()}
                  </Badge>
                </td>

                {/* Estado */}
                <td className="py-4 px-4">
                  <Badge variant="outline" className={badgeClass}>
                    {badgeLabel}
                  </Badge>
                </td>

                {/* Cliente */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900">
                      {reserva.cliente_nombre ||
                        reserva.cliente_id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                </td>

                {/* Almacén */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900">
                      {reserva.almacen_nombre ||
                        reserva.almacen_id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                </td>

                {/* Materiales */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {totalMateriales} tipo{totalMateriales !== 1 ? "s" : ""}
                    </span>
                    {totalReservado > 0 && (
                      <span className="text-xs text-gray-500">
                        ({totalConsumido}/{totalReservado})
                      </span>
                    )}
                  </div>
                </td>

                {/* Fecha Reserva */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {formatDate(reserva.fecha_reserva)}
                    </span>
                  </div>
                </td>

                {/* Expiración */}
                <td className="py-4 px-4">
                  <span
                    className={`text-sm ${
                      expiringSoon
                        ? "text-amber-600 font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    {formatDate(reserva.fecha_expiracion)}
                    {expiringSoon && (
                      <span className="ml-1 text-xs text-amber-500">
                        ¡Pronto!
                      </span>
                    )}
                  </span>
                </td>

                {/* Acciones */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1">
                    {onView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(reserva)}
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onEdit && isActiva && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(reserva)}
                        title="Editar reserva"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onConsumir && isActiva && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onConsumir(reserva)}
                        title="Registrar consumo"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <BookmarkCheck className="h-4 w-4" />
                      </Button>
                    )}
                    {onCancelar && isActiva && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancelar(reserva)}
                        title="Cancelar reserva"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
