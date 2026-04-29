"use client";

import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shared/molecule/dropdown-menu";
import {
  Calendar,
  ClipboardList,
  Eye,
  Pencil,
  RotateCcw,
  User,
  Warehouse,
  Ban,
  FileDown,
} from "lucide-react";
import type { SolicitudVentaSummary } from "@/lib/api-types";

export type ExportTipo = "conduce" | "garantia" | "ambos";

interface SolicitudesVentasTableProps {
  solicitudes: SolicitudVentaSummary[];
  onView?: (solicitud: SolicitudVentaSummary) => void;
  onEdit?: (solicitud: SolicitudVentaSummary) => void;
  onAnular?: (solicitud: SolicitudVentaSummary) => void;
  onReabrir?: (solicitud: SolicitudVentaSummary) => void;
  onExportar?: (solicitud: SolicitudVentaSummary, tipo: ExportTipo) => void;
}

export function SolicitudesVentasTable({
  solicitudes,
  onView,
  onEdit,
  onAnular,
  onReabrir,
  onExportar,
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

  const parseMaterialesCount = (resumen?: string): number => {
    if (!resumen) return 0;
    const match = resumen.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
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
            const estado = solicitud.estado?.toLowerCase();
            const isUsada = estado === "usada";
            const isAnulada = estado === "anulada";
            const isNueva = estado === "nueva";
            const cantidadMateriales = parseMaterialesCount(
              solicitud.materiales_resumen,
            );

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
                        : isAnulada
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }
                  >
                    {isUsada ? "Usada" : isAnulada ? "Anulada" : "Nueva"}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <p className="font-medium text-gray-900">
                    {solicitud.cliente_venta_nombre || "-"}
                  </p>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Warehouse className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{solicitud.almacen_nombre || "-"}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{solicitud.creador_nombre || "-"}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {cantidadMateriales} items
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
                    {onEdit && isNueva && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(solicitud)}
                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                        title="Editar solicitud"
                      >
                        <Pencil className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline text-xs">Editar</span>
                      </Button>
                    )}
                    {onAnular && isNueva && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAnular(solicitud)}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        title="Anular solicitud"
                      >
                        <Ban className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline text-xs">Anular</span>
                      </Button>
                    )}
                    {onReabrir && isAnulada && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReabrir(solicitud)}
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        title="Reabrir creando una nueva solicitud"
                      >
                        <RotateCcw className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline text-xs">
                          Reabrir
                        </span>
                      </Button>
                    )}
                    {onExportar && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-purple-300 text-purple-700 hover:bg-purple-50"
                            title="Exportar documentos"
                          >
                            <FileDown className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline text-xs">
                              Exportar
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onExportar(solicitud, "conduce")}
                          >
                            Conduce legal
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onExportar(solicitud, "garantia")}
                          >
                            Certificado de garantía
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onExportar(solicitud, "ambos")}
                          >
                            Ambos
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
