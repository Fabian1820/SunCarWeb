"use client";

import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  FileOutput,
  Eye,
  Calendar,
  User,
  Ban,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import type { ValeSalida } from "@/lib/api-types";

interface ValesSalidaTableProps {
  vales: ValeSalida[];
  onAnular?: (vale: ValeSalida) => void;
  onView?: (vale: ValeSalida) => void;
  onExportPdf?: (vale: ValeSalida) => void;
  onExportExcel?: (vale: ValeSalida) => void;
  loading?: boolean;
}

const getSolicitudTipo = (vale: ValeSalida): "material" | "venta" => {
  if (vale.solicitud_tipo === "venta") return "venta";
  if (vale.solicitud_venta_id || vale.solicitud_venta) return "venta";
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

  const getClienteInfo = (vale: ValeSalida) => {
    const cliente =
      vale.solicitud_venta?.cliente_venta ||
      vale.solicitud_venta?.cliente ||
      vale.solicitud_material?.cliente_venta ||
      vale.solicitud_material?.cliente ||
      vale.solicitud?.cliente_venta ||
      vale.solicitud?.cliente ||
      null;

    return {
      nombre: cliente?.nombre || "Sin cliente",
      direccion: cliente?.direccion || "-",
      telefono: cliente?.telefono || "-",
    };
  };

  const getTrabajadorName = (vale: ValeSalida) =>
    vale.trabajador?.nombre || vale.creado_por_ci || "-";

  const getRecibidoInfo = (vale: ValeSalida) => {
    const solicitud =
      vale.solicitud_material || vale.solicitud_venta || vale.solicitud;
    const recibidoPor =
      vale.recogio_por ||
      vale.recogido_por ||
      vale.recibido_por ||
      solicitud?.recogio_por ||
      solicitud?.recogido_por ||
      solicitud?.recibido_por ||
      solicitud?.responsable_recogida ||
      "-";

    const solicitudRecord = solicitud as unknown as Record<string, unknown>;
    const valeRecord = vale as unknown as Record<string, unknown>;
    const fechaRecogidaRaw =
      solicitud?.fecha_recogida ||
      (typeof solicitudRecord?.fechaRecogida === "string"
        ? solicitudRecord.fechaRecogida
        : undefined) ||
      (typeof valeRecord?.fecha_recogida === "string"
        ? valeRecord.fecha_recogida
        : undefined) ||
      (typeof valeRecord?.fechaRecogida === "string"
        ? valeRecord.fechaRecogida
        : undefined);

    return {
      recibidoPor,
      fechaRecogida: formatDate(fechaRecogidaRaw),
    };
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
              Recibió / Fecha recogida
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {vales.map((vale) => {
            const cliente = getClienteInfo(vale);
            const solicitudTipo = getSolicitudTipo(vale);
            const isAnulado = vale.estado === "anulado";
            const cantidadMateriales =
              vale.total_materiales ?? vale.materiales?.length ?? 0;
            const tipoStyles = getTipoStyles(solicitudTipo);
            const recibidoInfo = getRecibidoInfo(vale);
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
                    {getSolicitudCode(vale)}
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
                      Materiales: {cantidadMateriales}
                    </Badge>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="space-y-1.5">
                    <p className="font-medium text-gray-900">
                      {cliente.nombre}
                    </p>
                    <p className="text-sm text-gray-500">{cliente.direccion}</p>
                    <p className="text-sm text-gray-500">
                      Tel: {cliente.telefono}
                    </p>
                  </div>
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
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {recibidoInfo.recibidoPor}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {recibidoInfo.fechaRecogida}
                    </span>
                  </div>
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
                    {onExportPdf ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onExportPdf(vale)}
                        className="border-slate-300 text-slate-700 hover:bg-slate-50"
                        title="Exportar vale a PDF"
                      >
                        <FileText className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline text-xs">PDF</span>
                      </Button>
                    ) : null}
                    {onExportExcel ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onExportExcel(vale)}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                        title="Exportar vale a Excel"
                      >
                        <FileSpreadsheet className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline text-xs">Excel</span>
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
