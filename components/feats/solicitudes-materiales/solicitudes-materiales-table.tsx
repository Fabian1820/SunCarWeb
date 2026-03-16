"use client";

import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  Package,
  Eye,
  Calendar,
  User,
  Warehouse,
  Pencil,
  RotateCcw,
} from "lucide-react";
import type { SolicitudMaterial } from "@/lib/api-types";
import {
  formatFechaRecogida,
  getFechaRecogidaBadge,
} from "@/lib/utils/fecha-recogida";

interface SolicitudesMaterialesTableProps {
  solicitudes: SolicitudMaterial[];
  onEdit?: (solicitud: SolicitudMaterial) => void;
  onView?: (solicitud: SolicitudMaterial) => void;
  loading?: boolean;
}

export function SolicitudesMaterialesTable({
  solicitudes,
  onEdit,
  onView,
}: SolicitudesMaterialesTableProps) {
  const getClienteName = (s: SolicitudMaterial) => s.cliente?.nombre || null;
  const getAlmacenName = (s: SolicitudMaterial) => s.almacen?.nombre || "-";
  const getTrabajadorName = (s: SolicitudMaterial) =>
    s.trabajador?.nombre || "-";
  const getRecogidaBadgeClass = (solicitud: SolicitudMaterial) => {
    const badge = getFechaRecogidaBadge(solicitud.fecha_recogida);
    if (badge.kind === "today" || badge.kind === "unknown") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (badge.kind === "tomorrow") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (badge.kind === "future") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-red-50 text-red-700 border-red-200";
  };

  if (solicitudes.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay solicitudes de materiales
        </h3>
        <p className="text-gray-600">
          No se encontraron solicitudes que coincidan con los filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Codigo
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Estado
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Cliente
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Almacen
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Creador
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Materiales
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Recogida
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((solicitud) => {
            const clienteName = getClienteName(solicitud);
            const estado = solicitud.estado?.toLowerCase();
            const isUsada = estado === "usada";
            const isAnulada = estado === "anulada";

            return (
              <tr
                key={solicitud.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-4 px-4">
                  <Badge
                    variant="outline"
                    className="bg-purple-50 text-purple-700 border-purple-200 font-mono"
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
                        : isAnulada
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }
                  >
                    {isUsada ? "Usada" : isAnulada ? "Anulada" : "Nueva"}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  {clienteName ? (
                    <p className="font-medium text-gray-900">{clienteName}</p>
                  ) : (
                    <span className="text-gray-400 italic text-sm">
                      Sin cliente
                    </span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5">
                    <Warehouse className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {getAlmacenName(solicitud)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {getTrabajadorName(solicitud)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    <Package className="h-3 w-3 mr-1" />
                    {solicitud.materiales?.length || 0} items
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-700">
                        {formatFechaRecogida(solicitud.fecha_recogida)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[11px] ${getRecogidaBadgeClass(solicitud)}`}
                        >
                          {
                            getFechaRecogidaBadge(solicitud.fecha_recogida)
                              .label
                          }
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {solicitud.responsable_recogida || "Sin responsable"}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
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
                        className={
                          isAnulada
                            ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            : "border-amber-300 text-amber-700 hover:bg-amber-50"
                        }
                        title={
                          isUsada
                            ? "No se puede editar una solicitud usada"
                            : isAnulada
                              ? "Reabrir solicitud anulada"
                              : "Editar solicitud"
                        }
                        disabled={isUsada}
                      >
                        {isAnulada ? (
                          <RotateCcw className="h-4 w-4 sm:mr-1" />
                        ) : (
                          <Pencil className="h-4 w-4 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline text-xs">
                          {isAnulada ? "Reabrir" : "Editar"}
                        </span>
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
