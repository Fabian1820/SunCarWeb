"use client";

import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  Calendar,
  ClipboardList,
  Eye,
  Pencil,
  Trash2,
  User,
  Warehouse,
} from "lucide-react";
import type { SolicitudVenta } from "@/lib/api-types";

interface SolicitudesVentasTableProps {
  solicitudes: SolicitudVenta[];
  onView?: (solicitud: SolicitudVenta) => void;
  onEdit?: (solicitud: SolicitudVenta) => void;
  onDelete?: (solicitud: SolicitudVenta) => void;
}

export function SolicitudesVentasTable({
  solicitudes,
  onView,
  onEdit,
  onDelete,
}: SolicitudesVentasTableProps) {
  const formatDate = (value?: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (solicitudes.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay solicitudes de ventas
        </h3>
        <p className="text-gray-600">
          Crea una nueva solicitud para comenzar el flujo de ventas.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Codigo</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Cliente venta</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Almacen</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Creador</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Materiales</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((solicitud) => {
            const isUsada = solicitud.estado?.toLowerCase() === "usada";
            return (
              <tr
                key={solicitud.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-4 px-4">
                  <Badge
                    variant="outline"
                    className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono"
                  >
                    {solicitud.codigo || solicitud.id.slice(-6).toUpperCase()}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <Badge
                    variant="outline"
                    className={
                      isUsada
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }
                  >
                    {isUsada ? "Usada" : "Nueva"}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">
                      {solicitud.cliente_venta?.nombre || "-"}
                    </p>
                    {solicitud.cliente_venta?.numero && (
                      <p className="text-xs text-gray-500 font-mono">
                        {solicitud.cliente_venta.numero}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Warehouse className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{solicitud.almacen?.nombre || "-"}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{solicitud.trabajador?.nombre || "-"}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {solicitud.materiales?.length || 0} items
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{formatDate(solicitud.fecha_creacion)}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    {onView && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(solicitud)}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline text-xs">Ver</span>
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(solicitud)}
                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                        title="Editar solicitud"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(solicitud)}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        title="Eliminar solicitud"
                        disabled={isUsada}
                      >
                        <Trash2 className="h-4 w-4" />
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
