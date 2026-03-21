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
  FileOutput,
  Eye,
  Calendar,
  User,
  Ban,
  FileText,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import type { ValeSalidaSummary } from "@/lib/api-types";

interface ValesSalidaTableProps {
  vales: ValeSalidaSummary[];
  onAnular?: (vale: ValeSalidaSummary) => void;
  onView?: (vale: ValeSalidaSummary) => void;
  onExportPdf?: (vale: ValeSalidaSummary) => void;
  onExportExcel?: (vale: ValeSalidaSummary) => void;
  loading?: boolean;
}

const getSolicitudTipo = (vale: ValeSalidaSummary): "material" | "venta" => {
  if (vale.solicitud_tipo === "venta") return "venta";
  return "material";
};

const getEstadoLabel = (estado?: string) =>
  estado === "anulado" ? "Anulado" : "Usado";

const getEstadoStyles = (estado?: string) =>
  estado === "anulado"
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";

const getTipoStyles = (tipo: "material" | "venta") =>
  tipo === "venta"
    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

export function ValesSalidaTable({
  vales,
  onAnular,
  onView,
  onExportPdf,
  onExportExcel,
}: ValesSalidaTableProps) {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      // Si ya viene en formato "YYYY-MM-DD", convertir a "DD/MM/YYYY"
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
      }
      // Si es ISO 8601, usar toLocaleDateString
      return new Date(dateStr).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const parseMaterialesCount = (resumen?: string): number => {
    if (!resumen) return 0;
    const match = resumen.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

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
              Código vale
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Código solicitud
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Estado
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Tipo / Materiales
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Cliente
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Creador
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Recibido por
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {vales.map((vale) => {
            const solicitudTipo = getSolicitudTipo(vale);
            const isAnulado = vale.estado === "anulado";
            const cantidadMateriales = parseMaterialesCount(
              vale.materiales_resumen,
            );
            const tipoStyles = getTipoStyles(solicitudTipo);
            return (
              <tr
                key={vale.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-4 px-4">
                  <p className="font-mono font-medium text-gray-900">
                    {vale.codigo || vale.id.slice(-6).toUpperCase()}
                  </p>
                </td>
                <td className="py-4 px-4">
                  <p className="font-mono text-sm text-gray-900">
                    {vale.solicitud_codigo || "-"}
                  </p>
                </td>
                <td className="py-4 px-4">
                  <Badge
                    variant="outline"
                    className={getEstadoStyles(vale.estado)}
                  >
                    {getEstadoLabel(vale.estado)}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <div className="space-y-1">
                    <Badge variant="outline" className={tipoStyles}>
                      Tipo: {solicitudTipo === "venta" ? "Venta" : "Material"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-gray-50 text-gray-700 border-gray-200"
                    >
                      {vale.materiales_resumen || "0 materiales"}
                    </Badge>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <p className="font-medium text-gray-900">
                    {vale.cliente_nombre || "Sin cliente"}
                  </p>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {vale.creador_nombre || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {formatDate(vale.fecha_creacion)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  {/* Nombre de quien recibió */}
                  {vale.recibido_por ? (
                    <div className="flex items-center gap-1.5">
                      <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {vale.recibido_por}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <User className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      <span className="text-sm text-gray-400 italic">
                        Pendiente
                      </span>
                    </div>
                  )}

                  {/* Fecha de recogida (si existe) */}
                  {vale.fecha_recogida && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {formatDate(vale.fecha_recogida)}
                      </span>
                    </div>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
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
                    {(onExportPdf || onExportExcel) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-purple-300 text-purple-700 hover:bg-purple-50"
                            title="Exportar vale"
                          >
                            <Download className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline text-xs">Exportar</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onExportPdf ? (
                            <DropdownMenuItem
                              onClick={() => onExportPdf(vale)}
                              className="cursor-pointer"
                            >
                              <FileText className="h-4 w-4 mr-2 text-red-600" />
                              <span>Exportar a PDF</span>
                            </DropdownMenuItem>
                          ) : null}
                          {onExportExcel ? (
                            <DropdownMenuItem
                              onClick={() => onExportExcel(vale)}
                              className="cursor-pointer"
                            >
                              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                              <span>Exportar a Excel</span>
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
