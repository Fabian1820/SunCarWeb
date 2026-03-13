"use client";

import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { FileOutput, Eye, Calendar, User, Package, Ban } from "lucide-react";
import type { ValeSalida } from "@/lib/api-types";

interface ValesSalidaTableProps {
  vales: ValeSalida[];
  onAnular?: (vale: ValeSalida) => void;
  onView?: (vale: ValeSalida) => void;
  loading?: boolean;
}

const getSolicitudTipo = (vale: ValeSalida): "material" | "venta" => {
  if (vale.solicitud_tipo === "venta") return "venta";
  if (vale.solicitud_venta_id || vale.solicitud_venta) return "venta";
  return "material";
};

const getTipoStyles = (tipo: "material" | "venta") =>
  tipo === "venta"
    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

const getEstadoStyles = (estado?: string) =>
  estado === "anulado"
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";

export function ValesSalidaTable({
  vales,
  onAnular,
  onView,
}: ValesSalidaTableProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const getSolicitudCode = (vale: ValeSalida) =>
    vale.solicitud_material?.codigo ||
    vale.solicitud_venta?.codigo ||
    vale.solicitud?.codigo ||
    vale.solicitud_material_id?.slice(-6).toUpperCase() ||
    vale.solicitud_venta_id?.slice(-6).toUpperCase() ||
    vale.solicitud_id?.slice(-6).toUpperCase() ||
    "-";

  const getClienteName = (vale: ValeSalida) =>
    vale.solicitud_venta?.cliente_venta?.nombre ||
    vale.solicitud_venta?.cliente?.nombre ||
    vale.solicitud_material?.cliente?.nombre ||
    vale.solicitud?.cliente_venta?.nombre ||
    vale.solicitud?.cliente?.nombre ||
    null;

  const getTrabajadorName = (vale: ValeSalida) =>
    vale.trabajador?.nombre || vale.creado_por_ci || "-";

  if (vales.length === 0) {
    return (
      <div className="text-center py-12">
        <FileOutput className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay vales de salida
        </h3>
        <p className="text-gray-600">
          No se encontraron vales que coincidan con los filtros aplicados.
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
              Tipo
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Solicitud
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Cliente
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Creador
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Materiales
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Fecha
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {vales.map((vale) => {
            const clienteName = getClienteName(vale);
            const solicitudTipo = getSolicitudTipo(vale);
            const tipoStyles = getTipoStyles(solicitudTipo);
            const isAnulado = vale.estado === "anulado";
            return (
              <tr
                key={vale.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-4 px-4">
                  <Badge
                    variant="outline"
                    className="bg-orange-50 text-orange-700 border-orange-200 font-mono"
                  >
                    {vale.codigo || vale.id.slice(-6).toUpperCase()}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <Badge
                    variant="outline"
                    className={getEstadoStyles(vale.estado)}
                  >
                    {isAnulado ? "Anulado" : "Usado"}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <Badge variant="outline" className={tipoStyles}>
                    {solicitudTipo === "venta" ? "Venta" : "Material"}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <Badge
                    variant="outline"
                    className={`${tipoStyles} font-mono text-xs`}
                  >
                    {getSolicitudCode(vale)}
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
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {getTrabajadorName(vale)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    <Package className="h-3 w-3 mr-1" />
                    {vale.total_materiales ?? vale.materiales?.length ?? 0}{" "}
                    items
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {formatDate(vale.fecha_creacion)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    {onView ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(vale)}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline text-xs">Ver</span>
                      </Button>
                    ) : null}
                    {onAnular ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAnular(vale)}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        title={
                          isAnulado ? "El vale ya esta anulado" : "Anular vale"
                        }
                        disabled={isAnulado}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    ) : null}
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
